release: python manage.py makemigrations --noinput && python manage.py migrate --noinput
web: gunicorn api_gateway.wsgi:application --bind 0.0.0.0:$PORT --workers 3