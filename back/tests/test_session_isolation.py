
import sys
import os
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

# Adjust path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from back.app.main import app, get_session
from back.app import models

class TestSessionIsolation(unittest.TestCase):
    def setUp(self):
        # Create in-memory database
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        SQLModel.metadata.create_all(self.engine)

        # Override get_session dependency
        def get_session_override():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = get_session_override
        self.client = TestClient(app)
        self.session = Session(self.engine)

        # Setup initial data
        self.setup_data()

    def setup_data(self):
        # Create a tenant
        self.tenant = models.Tenant(name="Test Restaurant")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        # Create a floor and table
        self.floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(self.floor)
        self.session.commit()

        self.table = models.Table(name="T1", tenant_id=self.tenant.id, floor_id=self.floor.id)
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        # Create a product
        self.product = models.Product(
            name="Burger",
            price_cents=1000,
            tenant_id=self.tenant.id
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.session.close()

    def test_session_isolation(self):
        # 1. Create an order with a specific session_id
        session_id_owner = "user_session_123"
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "session_id": session_id_owner
            }
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        # Get order items
        response = self.client.get(f"/menu/{self.table.token}/order?session_id={session_id_owner}")
        current_order = response.json()["order"]
        item_id = current_order["items"][0]["id"]

        # 2. Try to update item quantity WITHOUT session_id (Attacker)
        response = self.client.put(
            f"/menu/{self.table.token}/order/{order_id}/items/{item_id}",
            json={"quantity": 5}
        )
        # Should fail with 403 Forbidden
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Order does not belong to this session")

        # 3. Try to update item quantity WITH WRONG session_id (Attacker)
        response = self.client.put(
            f"/menu/{self.table.token}/order/{order_id}/items/{item_id}",
            json={"quantity": 5},
            params={"session_id": "wrong_session"}
        )
        # Should fail with 403 Forbidden
        self.assertEqual(response.status_code, 403)

        # 4. Try to update item quantity WITH CORRECT session_id (Owner)
        response = self.client.put(
            f"/menu/{self.table.token}/order/{order_id}/items/{item_id}",
            json={"quantity": 5},
            params={"session_id": session_id_owner}
        )
        # Should succeed
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["new_quantity"], 5)

        # 5. Try to cancel order WITHOUT session_id (Attacker)
        response = self.client.delete(
            f"/menu/{self.table.token}/order/{order_id}"
        )
        # Should fail with 403 Forbidden
        self.assertEqual(response.status_code, 403)

        # 6. Try to cancel order WITH CORRECT session_id (Owner)
        response = self.client.delete(
            f"/menu/{self.table.token}/order/{order_id}",
            params={"session_id": session_id_owner}
        )
        # Should succeed
        self.assertEqual(response.status_code, 200)

    def test_cancel_order_clears_session_id(self):
        """After canceling, a new order with the same session_id should get a new order number."""
        session_id = "user_session_456"

        # Create first order
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "session_id": session_id
            }
        )
        self.assertEqual(response.status_code, 200)
        first_order_id = response.json()["order_id"]
        first_order_number = response.json().get("order_number")

        # Cancel the order
        response = self.client.delete(
            f"/menu/{self.table.token}/order/{first_order_id}",
            params={"session_id": session_id}
        )
        self.assertEqual(response.status_code, 200)

        # Create new order with the same session_id
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "session_id": session_id
            }
        )
        self.assertEqual(response.status_code, 200)
        second_order_id = response.json()["order_id"]
        second_order_number = response.json().get("order_number")

        # Should be a different order (not reusing the cancelled one)
        self.assertNotEqual(first_order_id, second_order_id)
        # Order number should have incremented (not reusing the cancelled order number)
        if first_order_number is not None and second_order_number is not None:
            self.assertNotEqual(first_order_number, second_order_number)

if __name__ == "__main__":
    unittest.main()
