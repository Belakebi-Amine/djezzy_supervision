from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_customuser_code_user_alter_customuser_email'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='code_user',
            field=models.CharField(editable=False, max_length=10, unique=True, verbose_name='Code utilisateur'),
        ),
    ]
