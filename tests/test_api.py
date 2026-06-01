import os
import shutil
import tempfile
import unittest


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix="jxc-test-")

        import app

        self.app_module = app
        app.DATA_DIR = os.path.join(self.tmpdir, "data")
        app.BACKUP_DIR = os.path.join(self.tmpdir, "backups")
        app.DB_PATH = os.path.join(app.DATA_DIR, "jxc_v2.db")
        app.PRINT_TEMPLATE_PATH = os.path.join(app.DATA_DIR, "print-template.html")
        app.init_db()
        self.client = app.app.test_client()

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["ok"])

    def test_seed_products_and_inventory(self):
        products = self.client.get("/api/products").get_json()
        self.assertGreaterEqual(len(products), 3)

        inventory = self.client.get("/api/inventory").get_json()
        self.assertGreaterEqual(len(inventory), 3)
        self.assertIn("product_code", inventory[0])

    def test_assistant_search(self):
        response = self.client.get("/api/assistant/search?q=SP001")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["query"], "SP001")
        self.assertGreaterEqual(len(data["products"]), 1)

    def test_create_sale_document_requires_items(self):
        response = self.client.post("/api/documents", json={"doc_type": "sale_out"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())


if __name__ == "__main__":
    unittest.main()
