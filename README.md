# The Caffeine Craft Cafe

A cafe website built with plain HTML5, CSS3, and JavaScript, backed by a Python Flask API and a SQLite relational SQL database.

## Run locally

Requirements: Python 3.10 or newer.

```sh
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Windows: copy .env.example .env
```

Edit `.env` and set a unique `TCC_SECRET_KEY`, `TCC_ADMIN_EMAIL`, and `TCC_ADMIN_PASSWORD`. Then start the application:

```sh
python server.py
```

Open <http://127.0.0.1:5000>. On first start, the app creates `instance/cafe.sqlite3`, creates the tables from `database/schema.sql`, seeds the 46 cafe menu items and three categories, and inserts the default business settings. The database file is local application data and should not be committed.

## Features

- Responsive cafe homepage, menu search and category filters, about and contact pages.
- Shopping bag saved in the browser, with server-side order validation and pricing.
- Order tracking by order number and matching phone number.
- Staff sign-in, recent order management, menu and category editing, and cafe settings.
- Checkout stays unavailable until pickup or delivery is enabled in Business settings. No online payment is collected.

## Configuration and deployment

The Flask server serves the static HTML, CSS, JavaScript, and cafe images from this repository. Keep `.env` private. Set a long random `TCC_SECRET_KEY` and strong staff credentials. Use HTTPS and a production WSGI server (such as Gunicorn) when deploying; do not run Flask's development server on a public production host. Back up the SQLite database file regularly. Set `TCC_DATABASE` to choose a different database file path.

Menu photos are representative stock images and are not photographs of the cafe's actual servings. Confirm menu details, prices, business information, photography rights, and fulfillment operations with the cafe before publishing or enabling online orders.
