"""
Lambda handler for simple chatbot
"""
from mangum import Mangum
from chatbot_server import app

handler = Mangum(app, lifespan="off")
