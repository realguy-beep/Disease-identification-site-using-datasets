import os
import sqlite3
import json
from datetime import datetime, timezone
from typing import List, Dict, Any

DB_PATH = 'predictions.db'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'predictions.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prediction_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            top_disease TEXT NOT NULL,
            top_confidence REAL NOT NULL,
            predictions_json TEXT NOT NULL,
            client_ip TEXT
        )
    ''')
    conn.commit()
    conn.close()

def log_prediction(symptoms: List[str], predictions: List[Dict[str, Any]], client_ip: str = None):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        top_disease = predictions[0]['disease'] if predictions else 'Unknown'
        top_confidence = predictions[0]['confidence'] if predictions else 0.0
        
        cursor.execute('''
            INSERT INTO prediction_logs (timestamp, symptoms, top_disease, top_confidence, predictions_json, client_ip)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now(timezone.utc).isoformat(),
            json.dumps(symptoms),
            top_disease,
            float(top_confidence),
            json.dumps(predictions),
            client_ip or ''
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging prediction: {e}")

def get_recent_logs(limit: int = 20):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM prediction_logs ORDER BY id DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        results = []
        for r in rows:
            results.append({
                'id': r['id'],
                'timestamp': r['timestamp'],
                'symptoms': json.loads(r['symptoms']),
                'top_disease': r['top_disease'],
                'top_confidence': r['top_confidence'],
                'predictions': json.loads(r['predictions_json'])
            })
        return results
    except Exception as e:
        print(f"Error retrieving logs: {e}")
        return []

if __name__ == '__main__':
    init_db()
    print("Database verified successfully.")
