# Supabase Built-In Email Setup (Zero SMTP / Zero Template Editing Needed)

Supabase provides a **free built-in email service out of the box**. When you use Supabase's built-in mailer without custom SMTP, **you do NOT need to change or edit any email templates!** 

Supabase automatically delivers its standard verification email with your 6-digit OTP code directly to the admin's inbox.

---

## 🛠️ Only 2 Steps in Supabase Dashboard (1-Minute Setup)

1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard/project/nmjdgbncmhiflixqxrwa).
2. Go to **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Email**:
   - Ensure **Enable Email Provider** is **`ON`**.
   - Ensure **Enable Email OTP (One-Time Password)** is **`ON`**.
   - (Optional) Set **Confirm email** to `OFF` if you want instant signup without email confirmation barriers.

That is literally all that is required!

---

## 📬 How the Login Works with Supabase Default Emails

1. In the Caspian App, click **"Login / Team Portal"** $\rightarrow$ **"Email Code / Forgot Password"**.
2. Enter your email and click **"Send Code"**.
3. Supabase will send its standard default email to your inbox:
   > *"Your code is: 123456"*
4. Enter that code into the app $\rightarrow$ you are instantly authenticated as Admin!

---

## 3. Optional: Custom Templates (Only Needed If You Set Up Custom SMTP in the Future)

If you ever configure custom SMTP in the future, you can customize the email HTML template under **Authentication** $\rightarrow$ **Email Templates** $\rightarrow$ **Magic Link**:

### Subject Line:
```
Your Caspian TeamOps Login Verification Code: {{ .Token }}
```

#### Body (HTML Code):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Caspian TeamOps Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; margin: 0; padding: 40px 20px; color: #e0e6ed; }
    .container { max-width: 520px; margin: 0 auto; background: #161822; border-radius: 16px; border: 1px solid rgba(124, 105, 239, 0.25); box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1f1b3c 0%, #161822 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #7c69ef, #5038ee); border-radius: 14px; margin-bottom: 12px; box-shadow: 0 8px 16px rgba(124,105,239,0.35); font-size: 28px; }
    .title { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; }
    .subtitle { font-size: 13px; color: #9aa5b8; margin-top: 6px; }
    .content { padding: 32px 28px; text-align: center; }
    .desc { font-size: 15px; line-height: 1.6; color: #c4cdd8; margin-bottom: 24px; }
    .code-box { background: #0f111a; border: 2px dashed #7c69ef; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 0 auto 24px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #a797ff; margin: 0; padding-left: 10px; }
    .note { font-size: 12px; color: #78859b; margin-top: 20px; line-height: 1.5; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7c69ef, #5038ee); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 10px; box-shadow: 0 6px 14px rgba(124,105,239,0.3); margin-top: 8px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #586377; border-top: 1px solid rgba(255,255,255,0.04); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">🛡️</div>
      <h1 class="title">Caspian TeamOps Sentinel</h1>
      <div class="subtitle">Autonomous Team Sentinel & Operational Hub</div>
    </div>
    <div class="content">
      <p class="desc">You requested an email verification login for your Admin Workspace. Enter this 6-digit verification code in the app to continue:</p>
      
      <div class="code-box">
        <div class="otp-code">{{ .Token }}</div>
      </div>
      
      <p class="note">This code will expire in <strong>60 minutes</strong>. If you did not request this login, you can safely ignore this email.</p>

      <div style="margin-top: 20px;">
        <a href="{{ .ConfirmationURL }}" class="btn">Or Click Here to Login Directly</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Caspian TeamOps Sentinel · Secure Autonomous Operations
    </div>
  </div>
</body>
</html>
```

---

### 📧 Template 2: Confirm Signup Email
**Location in Dashboard:** `Authentication` $\rightarrow` `Email Templates` $\rightarrow` `Confirm signup`

#### Subject Line:
```
Welcome to Caspian TeamOps - Confirm your email (Code: {{ .Token }})
```

#### Body (HTML Code):
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0c10; padding: 30px 15px; color: #e0e6ed; }
    .box { max-width: 500px; margin: 0 auto; background: #161822; border-radius: 14px; border: 1px solid rgba(124, 105, 239, 0.3); padding: 30px; text-align: center; }
    .code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #a797ff; background: #0f111a; padding: 14px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🛡️ Confirm Your Admin Account</h2>
    <p>Welcome to Caspian TeamOps Sentinel. Your verification code is:</p>
    <div class="code">{{ .Token }}</div>
    <p><a href="{{ .ConfirmationURL }}" style="color: #7c69ef;">Click here to confirm email</a></p>
  </div>
</body>
</html>
```

---

## 3. How the Backend & App Connect

- **Supabase Project URL:** `https://nmjdgbncmhiflixqxrwa.supabase.co`
- When you call `POST /auth/admin/send-otp`, Supabase dispatches this email template with `{{ .Token }}` populated.
- The Admin enters that 6-digit code in the App modal $\rightarrow$ calls `POST /auth/admin/verify-otp` $\rightarrow$ instant authenticated access!
