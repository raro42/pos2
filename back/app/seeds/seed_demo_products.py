"""
Seed demo restaurant (tenant 1) with a default set of products.
Idempotent: creates only products that don't exist (by tenant_id + name).
No image filenames so it works on any new deployment.

Usage:
  docker compose exec back python -m app.seeds.seed_demo_products
  cd back && python -m app.seeds.seed_demo_products
"""

import sys

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import engine
from app.models import Product, Tenant

DEMO_TENANT_ID = 1

# Default menu for demo restaurant: name, price_cents, category, ingredients (optional)
DEMO_PRODUCTS = [
    # Main courses
    ("Enchiladas", 2000, "Main Course", "tortillas, chiles, protein, cheese, cream"),
    ("Chile Relleno", 1500, "Main Course", "poblano peppers, cheese, eggs, tomato sauce"),
    ("Tacos de Carne Asada", 1200, "Main Course", "beef, tortillas, onion, cilantro, salsa"),
    ("Mole Poblano", 1500, "Main Course", "chocolate, chiles, chicken, sesame, almonds"),
    ("Pozole", 1800, "Main Course", "hominy, pork or chicken, chiles, oregano"),
    # Beverages
    ("Coca Cola", 300, "Beverages", None),
    ("Tecate Roja", 400, "Beverages", None),
    ("Tecate Light", 400, "Beverages", None),
    ("Water", 0, "Beverages", None),
    ("Coffee", 250, "Beverages", None),
]


def run() -> None:
    with Session(engine) as session:
        tenant = session.get(Tenant, DEMO_TENANT_ID)
        if not tenant:
            print(f"Tenant id={DEMO_TENANT_ID} not found. Create a tenant (e.g. via register) first.")
            sys.exit(1)

        result = session.execute(
            text('SELECT name FROM product WHERE tenant_id = :tid'),
            {"tid": DEMO_TENANT_ID},
        )
        existing_names = {row[0] for row in result.fetchall()}

        created = 0
        for name, price_cents, category, ingredients in DEMO_PRODUCTS:
            if name in existing_names:
                continue
            product = Product(
                tenant_id=DEMO_TENANT_ID,
                name=name,
                price_cents=price_cents,
                category=category,
                ingredients=ingredients,
                image_filename=None,
                description=None,
            )
            session.add(product)
            created += 1

        if created:
            session.commit()
            print(f"Created {created} demo products for tenant {DEMO_TENANT_ID}.")
        else:
            print("All demo products already exist for tenant 1.")

    print("Done.")


if __name__ == "__main__":
    run()
