from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_add_is_archived_to_user'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='customuser',
            name='must_change_password',
        ),
        migrations.DeleteModel(
            name='DemandeCompte',
        ),
    ]
