# dashboard/rapport_services.py
# ─────────────────────────────────────────────────────────────
# Report generation service. Collects real-time network data
# and produces professional HTML reports with analysis,
# trends, and recommendations.
# Uses Ollama (llama3.1:8b) for AI-powered report generation.
# Falls back to local rule-based generation if Ollama unavailable.
# ─────────────────────────────────────────────────────────────
import logging
from datetime import timedelta
from django.utils import timezone
from django.db import models
from django.db.models import Count, Q, Avg, F, Value, CharField
from django.db.models.functions import TruncDate, Coalesce
from decouple import config

logger = logging.getLogger(__name__)

OLLAMA_MODEL = config('OLLAMA_MODEL', default='qwen2.5:3b')

from reclamations.models import Reclamation
from sites_reseau.models import SiteReseau
from accounts.models import CustomUser, Role


# ── CSS shared across all reports ──────────────────────────
_CSS = """
font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
color: #1E293B; line-height: 1.65;
"""

def _card(content, border_left="#E8401A"):
    return (
        f'<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;'
        f'padding:20px 24px;margin-bottom:18px;border-left:4px solid {border_left};{_CSS}'
        f'page-break-inside:avoid;">'
        f'{content}</div>'
    )

def _kpi(label, value, color="#E8401A"):
    return (
        f'<div style="display:inline-block;text-align:center;padding:14px 22px;'
        f'background:#F8FAFC;border-radius:8px;border:1px solid #E5E7EB;min-width:120px;'
        f'margin:4px;">'
        f'<div style="font-size:10px;text-transform:uppercase;color:#64748B;font-weight:600;letter-spacing:0.5px;">{label}</div>'
        f'<div style="font-size:26px;font-weight:700;color:{color};margin-top:4px;">{value}</div>'
        f'</div>'
    )

def _table(headers, rows, widths=None):
    cols = len(headers)
    th = ''.join(
        f'<th style="padding:10px 14px;text-align:{"center" if i > 0 else "left"};'
        f'background:#F1F5F9;font-size:11px;text-transform:uppercase;letter-spacing:0.3px;'
        f'color:#475569;border-bottom:2px solid #E5E7EB;{f"width:{widths[i]};" if widths and widths[i] else ""}">{h}</th>'
        for i, h in enumerate(headers)
    )
    trs = ''
    for row in rows:
        tds = ''.join(
            f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;'
            f'font-size:12px;text-align:{"center" if i > 0 else "left"};'
            f'color:#334155;">{c}</td>'
            for i, c in enumerate(row)
        )
        trs += f'<tr style="transition:background 0.1s;" onmouseenter="this.style.background=\'#FEF2F2\'" onmouseleave="this.style.background=\'transparent\'">{tds}</tr>'
    return (
        f'<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">'
        f'<thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>'
    )

def _bar(value, max_val, color="#E8401A"):
    pct = round(value / max_val * 100, 1) if max_val else 0
    return (
        f'<div style="background:#F1F5F9;border-radius:6px;height:18px;width:100%;overflow:hidden;">'
        f'<div style="background:{color};height:100%;width:{pct}%;border-radius:6px;'
        f'transition:width 0.3s;"></div></div>'
    )


# ── Data collection (expanded) ─────────────────────────────

def _collecter_donnees(date_debut=None, date_fin=None):
    """Gathers comprehensive network statistics for report generation."""
    if date_debut and date_fin:
        debut = timezone.make_aware(timezone.datetime.combine(date_debut, timezone.datetime.min.time()))
        fin = timezone.make_aware(timezone.datetime.combine(date_fin, timezone.datetime.max.time()))
    else:
        debut = timezone.now() - timedelta(days=30)
        fin = timezone.now()

    # ── Site statistics ──
    total_sites = SiteReseau.objects.count()
    sites_up = SiteReseau.objects.filter(statut='UP').count()
    sites_down = SiteReseau.objects.filter(statut='DOWN').count()
    dispo = round((sites_up / total_sites * 100), 1) if total_sites else 100.0

    sites_par_techno = list(
        SiteReseau.objects.values('technologie')
        .annotate(total=Count('id'), up=Count('id', filter=Q(statut='UP')))
        .order_by('-total')
    )

    # ── Ticket statistics for the period ──
    tickets = Reclamation.objects.filter(created_at__range=(debut, fin))
    total_tickets = tickets.count()
    ouverts = tickets.filter(statut='ouvert').count()
    resolus = tickets.filter(statut='resolu').count()
    fermes = tickets.filter(statut='ferme').count()
    critiques = tickets.filter(priorite='critique').count()

    repartition_priorite = {
        'critique': tickets.filter(priorite='critique').count(),
        'haute': tickets.filter(priorite='haute').count(),
        'normale': tickets.filter(priorite='normale').count(),
        'basse': tickets.filter(priorite='basse').count(),
    }

    # ── Client type breakdown ──
    par_type_client = list(
        tickets.values('type_client').annotate(nb=Count('id')).order_by('-nb')
    )

    # ── Tickets per day (evolution) ──
    evolution = list(
        tickets.annotate(jour=TruncDate('created_at'))
        .values('jour')
        .annotate(nb=Count('id'))
        .order_by('jour')
    )

    # ── Top 7 most impacted sites ──
    top_sites = list(
        tickets.values('site__codeSite', 'site__nom', 'site__wilaya', 'site__commune')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:7]
    )

    # ── Top 5 wilayas ──
    wilayas = list(
        tickets.values('site__wilaya')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:5]
    )

    # ── Engineer performance ──
    ingenieurs = list(
        tickets.filter(assigne_a__role=Role.INGENIEUR_RESEAUX)
        .values('assigne_a__code_user', 'assigne_a__first_name', 'assigne_a__last_name')
        .annotate(
            total=Count('id'),
            resolus=Count('id', filter=Q(statut__in=['resolu', 'ferme'])),
            ouverts=Count('id', filter=Q(statut='ouvert')),
            critiques=Count('id', filter=Q(priorite='critique')),
        )
        .order_by('-total')
    )

    # ── Agent call center performance ──
    agents = list(
        tickets.filter(cree_par__role=Role.AGENT_CALL_CENTER)
        .values('cree_par__code_user', 'cree_par__first_name', 'cree_par__last_name')
        .annotate(total=Count('id'))
        .order_by('-total')
    )

    # ── Resolution metrics ──
    tickets_resolus = tickets.filter(statut__in=['resolu', 'ferme']).count()
    taux_resolution = round((tickets_resolus / total_tickets * 100), 1) if total_tickets else 0

    avg_delai = tickets.filter(
        statut__in=['resolu', 'ferme'], resolu_le__isnull=False
    ).annotate(
        duree=models.ExpressionWrapper(
            models.F('resolu_le') - models.F('created_at'),
            output_field=models.DurationField()
        )
    ).aggregate(avg=Avg('duree'))['avg']

    delai_moyen = "N/A"
    if avg_delai:
        heures = int(avg_delai.total_seconds() // 3600)
        minutes = int((avg_delai.total_seconds() % 3600) // 60)
        delai_moyen = f"{heures}h {minutes}m"

    # ── Keywords frequency ──
    top_keywords = list(
        tickets.values('mots_cles_ia')
        .annotate(nb=Count('id'))
        .order_by('-nb')[:10]
    )

    # ── Sites with most DOWN status ──
    sites_down_list = list(
        SiteReseau.objects.filter(statut='DOWN')
        .values('codeSite', 'nom', 'wilaya', 'commune', 'technologie')[:10]
    )

    return {
        'periode': {'debut': debut.strftime('%d/%m/%Y'), 'fin': fin.strftime('%d/%m/%Y')},
        'reseau': {
            'total_sites': total_sites, 'sites_up': sites_up,
            'sites_down': sites_down, 'disponibilite': dispo,
            'par_techno': sites_par_techno, 'sites_down_list': sites_down_list,
        },
        'tickets': {
            'total': total_tickets, 'ouverts': ouverts, 'resolus': resolus,
            'fermes': fermes, 'critiques': critiques,
            'taux_resolution': taux_resolution, 'delai_moyen': delai_moyen,
        },
        'priorites': repartition_priorite,
        'type_client': par_type_client,
        'evolution': [{'jour': e['jour'].strftime('%d/%m'), 'nb': e['nb']} for e in evolution],
        'top_sites': top_sites,
        'top_wilayas': [{'wilaya': w['site__wilaya'], 'nb': w['nb']} for w in wilayas if w['site__wilaya']],
        'ingenieurs': [
            {
                'code': i['assigne_a__code_user'],
                'nom': f"{i['assigne_a__first_name']} {i['assigne_a__last_name']}",
                'total': i['total'], 'resolus': i['resolus'],
                'ouverts': i['ouverts'], 'critiques': i['critiques'],
                'taux': round(i['resolus'] / i['total'] * 100, 1) if i['total'] else 0,
            }
            for i in ingenieurs
        ],
        'agents': [
            {
                'code': a['cree_par__code_user'],
                'nom': f"{a['cree_par__first_name']} {a['cree_par__last_name']}",
                'total': a['total'],
            }
            for a in agents
        ],
        'top_keywords': top_keywords,
    }


# ── Prompt analysis ────────────────────────────────────────

def _detecter_sections(prompt):
    """Analyzes the user prompt to determine which report sections to include."""
    p = prompt.lower()
    sections = []
    if any(w in p for w in ['reseau', 'site', 'infrastructure', 'disponibilite', 'up', 'down', 'panne', 'technologie', '5g', '4g', '3g']):
        sections.append('reseau')
    if any(w in p for w in ['ticket', 'reclamation', 'plainte', 'signale', 'ouvert', 'ferme']):
        sections.append('tickets')
    if any(w in p for w in ['priorite', 'critique', 'urgenc', 'haute']):
        sections.append('priorites')
    if any(w in p for w in ['resolution', 'delai', 'temps', 'moyen', 'traitement', 'resolu']):
        sections.append('resolution')
    if any(w in p for w in ['ingenieur', 'equipe', 'performance', 'agent', 'call center', 'technicien']):
        sections.append('performance_equipe')
    if any(w in p for w in ['wilaya', 'commune', 'zone', 'geograph', 'localisation', 'alger', 'oran']):
        sections.append('geographie')
    if any(w in p for w in ['client', 'entreprise', 'particulier', 'type', 'satisfaction']):
        sections.append('clients')
    if any(w in p for w in ['tendance', 'evolution', 'trend', 'variation', 'progression', 'compar']):
        sections.append('evolution')
    if any(w in p for w in ['mot', 'cle', 'keyword', 'motif', 'cause', 'raison']):
        sections.append('mots_cles')
    if any(w in p for w in ['recommand', 'suggestion', 'amelioration', 'action', 'plan']):
        sections.append('recommandations')
    if any(w in p for w in ['kpi', 'indicateur', 'metrique', 'resume', 'synthese', 'bilan', 'resume executif', 'vue densemble', 'vue d\'ensemble', 'global']):
        sections.append('kpi')
    # Default: if no specific section detected, show everything
    if not sections:
        sections = ['kpi', 'reseau', 'tickets', 'priorites', 'resolution', 'performance_equipe', 'geographie', 'evolution', 'recommandations']
    return sections


# ── Report sections ────────────────────────────────────────

def _section_kpi(d):
    t = d['tickets']
    r = d['reseau']
    return _card(
        '<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Indicateurs Cles (KPI)</h2>'
        '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">'
        + _kpi("Sites Total", r['total_sites'], "#2563EB")
        + _kpi("Sites UP", r['sites_up'], "#15803D")
        + _kpi("Sites DOWN", r['sites_down'], "#DC2626")
        + _kpi("Disponibilite", f"{r['disponibilite']}%", "#2563EB")
        + _kpi("Tickets Total", t['total'], "#E8401A")
        + _kpi("Taux Resolution", f"{t['taux_resolution']}%", "#15803D")
        + _kpi("Delai Moyen", t['delai_moyen'], "#7C3AED")
        + _kpi("Critiques", t['critiques'], "#DC2626")
        + '</div>',
        "#2563EB"
    )

def _section_reseau(d):
    r = d['reseau']
    tech_rows = ''
    for t in r['par_techno']:
        up_pct = round(t['up'] / t['total'] * 100, 1) if t['total'] else 0
        tech_rows += f"""<tr>
            <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;font-weight:600;">{t['technologie']}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;">{t['total']}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#15803D;font-weight:600;">{t['up']}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#DC2626;font-weight:600;">{t['total'] - t['up']}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{_bar(t['up'], t['total'], '#15803D')}</td>
            <td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;color:{'#15803D' if up_pct >= 95 else '#F59E0B' if up_pct >= 80 else '#DC2626'};">{up_pct}%</td>
        </tr>"""

    down_list = ''
    if r['sites_down_list']:
        down_items = ''.join(
            f'<li style="padding:6px 0;border-bottom:1px solid #F1F5F9;"><strong>{s["codeSite"]}</strong> — {s["nom"]} ({s["commune"]}, {s["wilaya"]}) <span style="color:#94A3B8;font-size:11px;">[{s["technologie"]}]</span></li>'
            for s in r['sites_down_list']
        )
        down_list = f"""
        <div style="margin-top:16px;padding:14px 18px;background:#FEF2F2;border-radius:8px;border:1px solid #FECACA;">
            <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:8px;">Sites en panne (DOWN) — {len(r['sites_down_list'])} site(s)</div>
            <ul style="margin:0;padding-left:18px;font-size:12px;color:#991B1B;">{down_items}</ul>
        </div>"""

    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Etat du Reseau</h2>'
        f'<p style="font-size:12px;color:#64748B;margin:0 0 14px;">{r["total_sites"]} sites total — {r["sites_up"]} UP — {r["sites_down"]} DOWN — Disponibilite globale: <strong>{r["disponibilite"]}%</strong></p>'
        f'<table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Technologie</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Total</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">UP</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">DOWN</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Dispo</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">%</th>'
        f'</tr></thead><tbody>{tech_rows}</tbody></table>'
        f'{down_list}',
        "#0EA5E9"
    )

def _section_tickets(d):
    t = d['tickets']
    tc = d.get('type_client', [])
    tc_rows = ''.join(
        f'<tr><td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;font-weight:600;text-transform:capitalize;">{c["type_client"] or "N/A"}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;">{c["nb"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{_bar(c["nb"], t["total"], "#E8401A")}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;">{round(c["nb"]/t["total"]*100,1) if t["total"] else 0}%</td></tr>'
        for c in tc
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Repartition des Reclamations</h2>'
        f'<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">'
        f'{_kpi("Total", t["total"], "#E8401A")}'
        f'{_kpi("Ouverts", t["ouverts"], "#F59E0B")}'
        f'{_kpi("Resolus", t["resolus"], "#15803D")}'
        f'{_kpi("Fermes", t["fermes"], "#64748B")}'
        f'</div>'
        f'<h3 style="font-size:13px;color:#334155;margin:16px 0 10px;">Par type de client</h3>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Type</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Tickets</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Repartition</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">%</th>'
        f'</tr></thead><tbody>{tc_rows}</tbody></table>',
        "#E8401A"
    )

def _section_priorites(d):
    p = d['priorites']
    total = sum(p.values()) or 1
    data = [
        ("Critique", p['critique'], "#DC2626"),
        ("Haute", p['haute'], "#F59E0B"),
        ("Normale", p['normale'], "#2563EB"),
        ("Basse", p['basse'], "#10B981"),
    ]
    rows = ''.join(
        f'<tr>'
        f'<td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:{color};margin-right:8px;vertical-align:middle;"></span><strong>{label}</strong></td>'
        f'<td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;">{nb}</td>'
        f'<td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;">{_bar(nb, total, color)}</td>'
        f'<td style="padding:10px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#64748B;">{round(nb/total*100,1)}%</td>'
        f'</tr>'
        for label, nb, color in data
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Repartition par Priorite</h2>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Niveau</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Tickets</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Repartition</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">%</th>'
        f'</tr></thead><tbody>{rows}</tbody></table>',
        "#F59E0B"
    )

def _section_resolution(d):
    t = d['tickets']
    top_sites = d['top_sites']
    sites_rows = ''.join(
        f'<tr>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;font-weight:600;">{s["site__codeSite"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{s["site__nom"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;color:#E8401A;">{s["nb"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{_bar(s["nb"], top_sites[0]["nb"] if top_sites else 1, "#E8401A")}</td>'
        f'</tr>'
        for s in top_sites
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Resolution & Sites Impactes</h2>'
        f'<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">'
        f'{_kpi("Taux Resolution", f"{t['taux_resolution']}%", "#15803D")}'
        f'{_kpi("Delai Moyen", t["delai_moyen"], "#7C3AED")}'
        f'</div>'
        f'<h3 style="font-size:13px;color:#334155;margin:16px 0 10px;">Top sites les plus impactes</h3>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Code</th>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Site</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Tickets</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;"></th>'
        f'</tr></thead><tbody>{sites_rows}</tbody></table>',
        "#15803D"
    )

def _section_performance_equipe(d):
    ing = d.get('ingenieurs', [])
    if not ing:
        return ''
    ing_rows = ''.join(
        f'<tr>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;font-weight:600;">{i["code"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{i["nom"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;">{i["total"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#15803D;">{i["resolus"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#F59E0B;">{i["ouverts"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;color:#DC2626;">{i["critiques"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{_bar(i["resolus"], i["total"] or 1, "#15803D")}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;color:{'#15803D' if i["taux"] >= 80 else '#F59E0B' if i["taux"] >= 60 else '#DC2626'};">{i["taux"]}%</td>'
        f'</tr>'
        for i in ing
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Performance des Ingenieurs</h2>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Code</th>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Nom</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Total</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Resolus</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Ouverts</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Critiques</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Taux</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">%</th>'
        f'</tr></thead><tbody>{ing_rows}</tbody></table>',
        "#7C3AED"
    )

def _section_geographie(d):
    w = d.get('top_wilayas', [])
    if not w:
        return ''
    rows = ''.join(
        f'<tr>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;font-weight:600;">{x["wilaya"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;">{x["nb"]}</td>'
        f'<td style="padding:9px 14px;border-bottom:1px solid #F1F5F9;">{_bar(x["nb"], w[0]["nb"] if w else 1, "#0EA5E9")}</td>'
        f'</tr>'
        for x in w
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Repartition Geographique</h2>'
        f'<p style="font-size:12px;color:#64748B;margin:0 0 12px;">Top 5 wilayas par volume de tickets</p>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Wilaya</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Tickets</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Volume</th>'
        f'</tr></thead><tbody>{rows}</tbody></table>',
        "#0EA5E9"
    )

def _section_evolution(d):
    evo = d.get('evolution', [])
    if not evo:
        return ''
    max_nb = max((x['nb'] for x in evo), default=1)
    evo_rows = ''.join(
        f'<tr>'
        f'<td style="padding:8px 14px;border-bottom:1px solid #F1F5F9;font-size:12px;">{x["jour"]}</td>'
        f'<td style="padding:8px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;">{x["nb"]}</td>'
        f'<td style="padding:8px 14px;border-bottom:1px solid #F1F5F9;">{_bar(x["nb"], max_nb, "#E8401A")}</td>'
        f'</tr>'
        for x in evo[-15:]
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Evolution des Tickets</h2>'
        f'<p style="font-size:12px;color:#64748B;margin:0 0 12px;">Derniers {min(len(evo), 15)} jours</p>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Date</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Tickets</th>'
        f'<th style="padding:10px 14px;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Volume</th>'
        f'</tr></thead><tbody>{evo_rows}</tbody></table>',
        "#E8401A"
    )

def _section_mots_cles(d):
    kw = d.get('top_keywords', [])
    if not kw:
        return ''
    rows = ''.join(
        f'<tr>'
        f'<td style="padding:8px 14px;border-bottom:1px solid #F1F5F9;font-size:12px;">{k["mots_cles_ia"]}</td>'
        f'<td style="padding:8px 14px;border-bottom:1px solid #F1F5F9;text-align:center;font-weight:700;">{k["nb"]}</td>'
        f'</tr>'
        for k in kw
    )
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Mots-cles les Plus Frequents</h2>'
        f'<table style="width:100%;border-collapse:collapse;">'
        f'<thead><tr>'
        f'<th style="padding:10px 14px;text-align:left;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Mot-cle</th>'
        f'<th style="padding:10px 14px;text-align:center;background:#F1F5F9;font-size:11px;text-transform:uppercase;color:#475569;border-bottom:2px solid #E5E7EB;">Occurrences</th>'
        f'</tr></thead><tbody>{rows}</tbody></table>',
        "#64748B"
    )

def _section_recommandations(d):
    t = d['tickets']
    r = d['reseau']
    recs = []
    if t['critiques'] > 0:
        pct_crit = round(t['critiques'] / t['total'] * 100, 1) if t['total'] else 0
        recs.append(f"<li><strong>Prioriser les tickets critiques :</strong> {t['critiques']} tickets critiques representent {pct_crit}% du total. Une procedure d'escalade automatique devrait etre envisagee pour les incidents de priorite critique.</li>")
    if r['sites_down'] > 0:
        recs.append(f"<li><strong>Intervention urgente sur les sites DOWN :</strong> {r['sites_down']} site(s) sont en panne. Une equipe technique devrait etre deployee en priorite pour restaurer la couverture.</li>")
    if t['ouverts'] > 0:
        pct_ouverts = round(t['ouverts'] / t['total'] * 100, 1) if t['total'] else 0
        recs.append(f"<li><strong>Reduire les tickets ouverts :</strong> {t['ouverts']} tickets restent ouverts ({pct_ouverts}%). Renforcer l'equipe de resolution ou ameliorer les procedures de traitement.</li>")
    taux = t['taux_resolution']
    if taux < 80:
        recs.append(f"<li><strong>Ameliorer le taux de resolution :</strong> Le taux actuel de {taux}% est en dessous de l'objectif de 80%. Former les agents et automatiser certaines taches.</li>")
    if r['disponibilite'] < 95:
        recs.append(f"<li><strong>Renforcer la disponibilite reseau :</strong> {r['disponibilite']}% de disponibilite est insuffisant. Investir dans les equipements de secours (batterie, generateur).</li>")
    recs.append("<li><strong>Mettre en place un tableau de bord en temps reel :</strong> Surveiller les KPI en continu pour detecter les anomalies plus tot.</li>")
    recs.append("<li><strong>Analyser les tendances mensuelles :</strong> Comparer chaque mois precedent pour identifier les ameliorations ou degradations.</li>")

    items = ''.join(recs)
    return _card(
        f'<h2 style="margin:0 0 16px;font-size:16px;color:#0F172A;">Recommandations</h2>'
        f'<ol style="margin:0;padding-left:20px;font-size:13px;color:#334155;line-height:1.8;">{items}</ol>',
        "#15803D"
    )


# ── Main generation function ───────────────────────────────

def generer_rapport_ia(prompt_utilisateur, date_debut=None, date_fin=None):
    """
    Generates a professional HTML report from real database data.
    Analyzes the user prompt to include relevant sections.
    Uses Ollama (llama3.1:8b) locally. Falls back to local generation
    if Ollama is unavailable.
    """
    donnees = _collecter_donnees(date_debut, date_fin)

    # Try Ollama first
    try:
        import ollama as ollama_lib

        # Summarize data for Ollama to keep prompt small and fast
        resume = (
            f"Periode: {donnees['periode']['debut']} - {donnees['periode']['fin']}\n"
            f"Reseau: {donnees['reseau']['total_sites']} sites, "
            f"{donnees['reseau']['sites_up']} UP, {donnees['reseau']['sites_down']} DOWN, "
            f"Disponibilite: {donnees['reseau']['disponibilite']}%\n"
            f"Tickets: {donnees['tickets']['total']} total, "
            f"{donnees['tickets']['ouverts']} ouverts, {donnees['tickets']['resolus']} resolus, "
            f"{donnees['tickets']['fermes']} fermes, {donnees['tickets']['critiques']} critiques, "
            f"Taux resolution: {donnees['tickets']['taux_resolution']}%, Delai moyen: {donnees['tickets']['delai_moyen']}\n"
            f"Priorites: {donnees['priorites']}\n"
            f"Top wilayas: {', '.join(w['wilaya'] + '(' + str(w['nb']) + ')' for w in donnees['top_wilayas'][:5])}\n"
            f"Ingenieurs: {', '.join(i['nom'] + ':' + str(i['total']) + ' tickets/' + str(i['resolus']) + ' resolus' for i in donnees['ingenieurs'])}\n"
            f"Top mots-cles: {', '.join(k['mots_cles_ia'] + '(' + str(k['nb']) + ')' for k in donnees['top_keywords'][:7])}\n"
        )

        prompt = f"""Tu es un analyste reseau expert pour Djezzy, operateur mobile en Algerie.
Redige un rapport professionnel en francais en HTML.

Donnees :
{resume}

Demande : {prompt_utilisateur}

Consignes :
- Francais, HTML inline CSS, pas de balises html/head/body.
- Sections: KPI, etat reseau, tickets, recommandations.
- Concis, 1 page A4."""

        response = ollama_lib.chat(
            model=OLLAMA_MODEL,
            messages=[{'role': 'user', 'content': prompt}],
            options={'temperature': 0.3, 'num_predict': 1024},
        )
        html = response['message']['content'].strip()
        if html.startswith('```html'):
            html = html[7:]
        if html.endswith('```'):
            html = html[:-3]
        return html.strip()

    except Exception as e:
        logger.warning("Ollama indisponible pour rapport, generation locale: %s", e)

    # Local generation: analyze prompt and build report from real data
    sections = _detecter_sections(prompt_utilisateur)
    periode = donnees['periode']

    header = (
        f'<div style="background:linear-gradient(135deg,#E8401A 0%,#B91C1C 100%);color:#fff;'
        f'padding:28px 32px;border-radius:10px;margin-bottom:22px;">'
        f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.8;margin-bottom:6px;">Djezzy Supervision — Rapport Genere par IA</div>'
        f'<h1 style="margin:0;font-size:22px;font-weight:700;">{prompt_utilisateur[:120]}</h1>'
        f'<div style="margin-top:10px;font-size:12px;opacity:0.85;">'
        f'Periode : <strong>{periode["debut"]}</strong> — <strong>{periode["fin"]}</strong>'
        f'&nbsp;&nbsp;|&nbsp;&nbsp;Genere le : <strong>{timezone.now().strftime("%d/%m/%Y a %H:%M")}</strong>'
        f'</div></div>'
    )

    section_map = {
        'kpi': _section_kpi,
        'reseau': _section_reseau,
        'tickets': _section_tickets,
        'priorites': _section_priorites,
        'resolution': _section_resolution,
        'performance_equipe': _section_performance_equipe,
        'geographie': _section_geographie,
        'evolution': _section_evolution,
        'mots_cles': _section_mots_cles,
        'recommandations': _section_recommandations,
    }

    body = ''
    for s in sections:
        if s in section_map:
            html_section = section_map[s](donnees)
            if html_section:
                body += html_section

    footer = (
        f'<div style="text-align:center;padding:18px;font-size:10px;color:#94A3B8;'
        f'border-top:1px solid #E5E7EB;margin-top:20px;">'
        f'Rapport genere automatiquement par le systeme Djezzy Supervision — '
        f'{timezone.now().strftime("%d/%m/%Y %H:%M")}</div>'
    )

    return header + body + footer


def generer_rapport_local(prompt_utilisateur, date_debut=None, date_fin=None):
    """
    Local template-based report generation — no Ollama needed.
    Used by the seed command for fast bulk generation.
    """
    donnees = _collecter_donnees(date_debut, date_fin)
    sections = _detecter_sections(prompt_utilisateur)
    periode = donnees['periode']

    header = (
        f'<div style="background:linear-gradient(135deg,#E8401A 0%,#B91C1C 100%);color:#fff;'
        f'padding:28px 32px;border-radius:10px;margin-bottom:22px;">'
        f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.8;margin-bottom:6px;">Djezzy Supervision — Rapport Genere par IA</div>'
        f'<h1 style="margin:0;font-size:22px;font-weight:700;">{prompt_utilisateur[:120]}</h1>'
        f'<div style="margin-top:10px;font-size:12px;opacity:0.85;">'
        f'Periode : <strong>{periode["debut"]}</strong> — <strong>{periode["fin"]}</strong>'
        f'&nbsp;&nbsp;|&nbsp;&nbsp;Genere le : <strong>{timezone.now().strftime("%d/%m/%Y a %H:%M")}</strong>'
        f'</div></div>'
    )

    section_map = {
        'kpi': _section_kpi,
        'reseau': _section_reseau,
        'tickets': _section_tickets,
        'priorites': _section_priorites,
        'resolution': _section_resolution,
        'performance_equipe': _section_performance_equipe,
        'geographie': _section_geographie,
        'evolution': _section_evolution,
        'mots_cles': _section_mots_cles,
        'recommandations': _section_recommandations,
    }

    body = ''
    for s in sections:
        if s in section_map:
            html_section = section_map[s](donnees)
            if html_section:
                body += html_section

    footer = (
        f'<div style="text-align:center;padding:18px;font-size:10px;color:#94A3B8;'
        f'border-top:1px solid #E5E7EB;margin-top:20px;">'
        f'Rapport genere automatiquement par le systeme Djezzy Supervision — '
        f'{timezone.now().strftime("%d/%m/%Y %H:%M")}</div>'
    )

    return header + body + footer
