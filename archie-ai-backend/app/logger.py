"""
Python Backend Logging Configuration
Provides structured JSON logging for the AI backend service
Follows the tech stack requirement for comprehensive workflow logging
"""

import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logger():
    """
    Configure structured JSON logging for the Python backend
    Creates a logger instance with proper formatting and handlers
    """
    
    # Get the logger instance
    logger = logging.getLogger("archie-ai-backend")
    logger.setLevel(logging.INFO)
    
    # Avoid adding handlers multiple times in serverless environments
    if not logger.handlers:
        # Create a handler to output to console
        log_handler = logging.StreamHandler(sys.stdout)
        
        # Create a JSON formatter and add it to the handler
        formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        log_handler.setFormatter(formatter)
        
        # Add the handler to the logger
        logger.addHandler(log_handler)
    
    return logger

# Export the configured logger instance
logger = setup_logger() 