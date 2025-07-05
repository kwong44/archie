# Supabase Email Confirmation Setup

## Overview
This guide will help you set up the email confirmation template for new user signups in your Supabase project.

## Step 1: Navigate to Supabase Email Templates

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Select **Confirm signup** template

## Step 2: Configure Site URL

Before setting up the email template, make sure your Site URL is configured:

1. Go to **Authentication** > **Settings**
2. Set your **Site URL** to:
   - **Development:** `exp://localhost:8081` (or your Expo development URL)
   - **Production:** `https://yourapp.com` (your actual app URL)

## Step 3: Email Template Configuration

### Subject Line
```
Welcome to Archie - Confirm Your Email
```

### Email Template (HTML)
Paste the following HTML template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email - Archie</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #F5F5F0;
            background-color: #121820;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1F2937;
            border-radius: 16px;
            border: 1px solid #374151;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #121820 0%, #1F2937 100%);
            padding: 40px 20px;
            text-align: center;
            border-bottom: 1px solid #374151;
        }
        .logo {
            width: 80px;
            height: 80px;
            background-color: #1F2937;
            border: 1px solid #374151;
            border-radius: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            font-size: 32px;
            font-weight: 700;
            color: #FFC300;
        }
        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #F5F5F0;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 16px;
            color: #9CA3AF;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome {
            font-size: 18px;
            color: #F5F5F0;
            margin-bottom: 24px;
            text-align: center;
        }
        .description {
            font-size: 16px;
            color: #9CA3AF;
            margin-bottom: 32px;
            text-align: center;
            line-height: 1.6;
        }
        .cta-container {
            text-align: center;
            margin-bottom: 32px;
        }
        .cta-button {
            display: inline-block;
            background-color: #FFC300;
            color: #121820;
            font-size: 18px;
            font-weight: 600;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            text-align: center;
        }
        .alt-link {
            background-color: #121820;
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
        }
        .alt-link h3 {
            font-size: 16px;
            color: #F5F5F0;
            margin-bottom: 8px;
        }
        .alt-link p {
            font-size: 14px;
            color: #9CA3AF;
            margin-bottom: 12px;
        }
        .alt-link a {
            color: #FFC300;
            text-decoration: none;
            word-break: break-all;
            font-size: 14px;
        }
        .footer {
            background-color: #121820;
            padding: 30px 20px;
            text-align: center;
            border-top: 1px solid #374151;
        }
        .footer p {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 8px;
        }
        .footer a {
            color: #FFC300;
            text-decoration: none;
        }
        .security {
            background-color: #1F2937;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 16px;
            margin-top: 24px;
        }
        .security p {
            font-size: 12px;
            color: #9CA3AF;
            margin: 0;
        }
        @media (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .header { padding: 30px 15px; }
            .content { padding: 30px 20px; }
            .cta-button { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">A</div>
            <h1>Welcome to Archie!</h1>
            <p class="subtitle">Your journey of transformation begins now</p>
        </div>
        
        <div class="content">
            <div class="welcome">Confirm your email to get started</div>
            
            <div class="description">
                Thanks for joining Archie! We're excited to help you become the architect of your reality by transforming your language.
                <br><br>
                To complete your registration and start your journey, please confirm your email address by clicking the button below.
            </div>
            
            <div class="cta-container">
                <a href="{{ .ConfirmationURL }}" class="cta-button">
                    Confirm Email Address
                </a>
            </div>
            
            <div class="alt-link">
                <h3>Button not working?</h3>
                <p>Copy and paste this link into your browser:</p>
                <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a>
            </div>
            
            <div class="security">
                <p>
                    🔒 This email was sent to {{ .Email }} because you (or someone) attempted to create an account with Archie. 
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>This link will expire in 24 hours for security reasons.</p>
            <p>Need help? <a href="mailto:support@archie.app">Contact our support team</a></p>
            <p>© 2024 Archie. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

## Step 4: Configure Redirect URLs

In your Supabase project, make sure to add these redirect URLs:

1. Go to **Authentication** > **Settings** > **Redirect URLs**
2. Add these URLs:
   - **Development:** `exp://localhost:8081/success`
   - **Production:** `archie://success`

## Step 5: Test the Flow

1. Create a new user account through your app
2. Check your email for the confirmation message
3. Click the confirmation link
4. Verify you're redirected to the success page
5. Confirm the user is properly authenticated

## Available Email Variables

Supabase provides these variables for email templates:

- `{{ .Email }}` - The user's email address
- `{{ .ConfirmationURL }}` - The confirmation URL with token
- `{{ .Token }}` - The raw confirmation token
- `{{ .TokenHash }}` - The hashed token
- `{{ .SiteURL }}` - Your configured site URL
- `{{ .RedirectTo }}` - The redirect URL (if provided)

## Notes

- The confirmation link will expire in 24 hours by default
- Users can request a new confirmation email if needed
- The success page will automatically redirect users to onboarding after verification
- Email styling is optimized for both desktop and mobile devices

## Troubleshooting

If emails aren't being sent:
1. Check your SMTP settings in Supabase
2. Verify your redirect URLs are correctly configured
3. Check spam/junk folders
4. Ensure your site URL matches your app's URL scheme 