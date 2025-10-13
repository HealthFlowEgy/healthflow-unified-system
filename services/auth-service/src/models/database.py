"""
Database instance for SQLAlchemy
Centralized to avoid circular dependencies
"""
from flask_sqlalchemy import SQLAlchemy

# Create the database instance
db = SQLAlchemy()


def init_db(app):
    """
    Initialize the database with the Flask app
    
    Args:
        app: Flask application instance
    """
    db.init_app(app)
    return db

