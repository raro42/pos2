
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

class TestPaymentSecurity(unittest.TestCase):
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
        self.tenant = models.Tenant(name="Test Restaurant", stripe_secret_key="sk_test_123")
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
            name="Expensive Wine",
            price_cents=10000,  # $100.00
            tenant_id=self.tenant.id
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.session.close()

    @patch("stripe.PaymentIntent.retrieve")
    def test_prevent_payment_bypass_amount_mismatch(self, mock_retrieve):
        # 1. Create an expensive order ($100)
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order"
            }
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        # 2. Simulate a cheap payment intent ($1)
        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 100  # $1.00
        mock_intent.id = "pi_cheap_123"
        # Metadata matches order ID but amount is wrong
        mock_intent.metadata = {"order_id": str(order_id)}

        mock_retrieve.return_value = mock_intent

        # 3. Try to confirm
        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_cheap_123"
            }
        )

        # Should fail with 400 Bad Request due to amount mismatch
        self.assertEqual(response.status_code, 400)
        self.assertIn("Payment mismatch: Amount", response.json()["detail"])

    @patch("stripe.PaymentIntent.retrieve")
    def test_prevent_payment_bypass_order_mismatch(self, mock_retrieve):
        # 1. Create an expensive order ($100)
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order"
            }
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        # 2. Simulate a payment intent with correct amount but WRONG order ID
        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000  # $100.00 (correct amount)
        mock_intent.id = "pi_wrong_order"
        mock_intent.metadata = {"order_id": "9999"} # Wrong order ID

        mock_retrieve.return_value = mock_intent

        # 3. Try to confirm
        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_wrong_order"
            }
        )

        # Should fail with 400 Bad Request due to order mismatch
        self.assertEqual(response.status_code, 400)
        self.assertIn("Payment mismatch: Payment does not belong to this order", response.json()["detail"])

    @patch("stripe.PaymentIntent.retrieve")
    def test_payment_success(self, mock_retrieve):
        # 1. Create an order ($100)
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order"
            }
        )
        self.assertEqual(response.status_code, 200)
        order_data = response.json()
        order_id = order_data["order_id"]

        # 2. Simulate correct payment intent
        mock_intent = MagicMock()
        mock_intent.status = "succeeded"
        mock_intent.amount = 10000  # $100.00
        mock_intent.id = "pi_correct"
        mock_intent.metadata = {"order_id": str(order_id)}

        mock_retrieve.return_value = mock_intent

        # 3. Confirm
        response = self.client.post(
            f"/orders/{order_id}/confirm-payment",
            params={
                "table_token": self.table.token,
                "payment_intent_id": "pi_correct"
            }
        )

        # Should succeed
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "paid")

if __name__ == "__main__":
    unittest.main()
