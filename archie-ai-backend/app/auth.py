"""
JWT Authentication for Supabase Tokens
Validates JWT tokens from Supabase Auth for secure API access
Follows the backend interaction guidelines for authentication flow
"""

import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from .logger import logger


def verify_jwt(credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """
    Verify and decode Supabase JWT token
    Validates the token signature and returns the payload
    
    Args:
        credentials: HTTP authorization credentials containing the JWT token
        
    Returns:
        Dict containing the decoded JWT payload with user information
        
    Raises:
        HTTPException: If token is invalid, expired, or missing
    """
    
    token = credentials.credentials
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
    
    if not jwt_secret:
        logger.error("JWT secret not configured", extra={
            'error_type': 'configuration_error'
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication configuration error"
        )
    
    try:
        logger.info("Verifying JWT token", extra={
            'token_length': len(token),
            'has_bearer_prefix': token.startswith('Bearer')
        })
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Decode and verify the JWT token
        payload = jwt.decode(
            token, 
            jwt_secret, 
            algorithms=["HS256"],
            audience="authenticated"  # Supabase default audience
        )
        
        # Extract user information from payload
        user_id = payload.get("sub")
        user_email = payload.get("email")
        
        if not user_id:
            logger.error("Invalid JWT payload - missing user ID", extra={
                'payload_keys': list(payload.keys())
            })
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        logger.info("JWT token verified successfully", extra={
            'user_id': user_id,
            'user_email': user_email,
            'token_exp': payload.get('exp'),
            'token_iat': payload.get('iat')
        })
        
        return payload
    
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired", extra={
            'error_type': 'token_expired'
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid JWT token", extra={
            'error_type': 'invalid_token',
            'jwt_error': str(e)
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    except Exception as e:
        logger.error("Unexpected error during JWT verification", extra={
            'error_type': 'unexpected_error',
            'error': str(e)
        }, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication verification failed"
        )


def get_user_id_from_token(credentials: HTTPAuthorizationCredentials) -> str:
    """
    Extract user ID from verified JWT token
    Convenience function for routes that only need the user ID
    
    Args:
        credentials: HTTP authorization credentials containing the JWT token
        
    Returns:
        String containing the user ID from the token
    """
    
    payload = verify_jwt(credentials)
    return payload["sub"]


def get_user_email_from_token(credentials: HTTPAuthorizationCredentials) -> Optional[str]:
    """
    Extract user email from verified JWT token
    Convenience function for routes that need the user email
    
    Args:
        credentials: HTTP authorization credentials containing the JWT token
        
    Returns:
        String containing the user email from the token, or None if not present
    """
    
    payload = verify_jwt(credentials)
    return payload.get("email") 