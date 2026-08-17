<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $actionLabel }} Security Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0e14; margin: 0; padding: 30px 15px; color: #cbd5e1;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #141b26; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
        <!-- Header -->
        <tr>
            <td style="background: linear-gradient(135deg, #1b2433 0%, #0f141c 100%); padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                <table align="center" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="background: linear-gradient(135deg, #ff7d11 0%, #c74a02 100%); width: 42px; height: 42px; border-radius: 10px; text-align: center; vertical-align: middle; font-size: 20px; font-weight: 800; color: #0a0e14;">
                            H
                        </td>
                        <td style="padding-left: 12px; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                            Home Service Hub
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Content -->
        <tr>
            <td style="padding: 32px 28px;">
                <h2 style="margin: 0 0 12px 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                    {{ $action === 'delete_account' ? 'Security Verification: Account Deletion' : 'Security Verification: Password Change' }}
                </h2>
                
                <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                    Hello <strong style="color: #ffffff;">{{ $user->name }}</strong>,<br>
                    @if($action === 'delete_account')
                        We received a request to <strong style="color: #f87171;">permanently delete your account</strong>. To complete this request, please enter the one-time security code below:
                    @else
                        We received a request to <strong style="color: #ffbd71;">change your account password</strong>. To complete this change, please enter the one-time security code below:
                    @endif
                </p>

                <!-- Code Badge -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                    <tr>
                        <td align="center">
                            <div style="display: inline-block; background-color: rgba(255, 125, 17, 0.1); border: 2px dashed #ff7d11; border-radius: 12px; padding: 18px 36px; text-align: center;">
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #ff9b38; display: block; margin-right: -10px;">
                                    {{ $code }}
                                </span>
                            </div>
                        </td>
                    </tr>
                </table>

                <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                    This security code is valid for <strong>{{ $expiresInMinutes }} minutes</strong>. Do not share this code with anyone.
                </p>

                <!-- Security Alert Box -->
                <div style="margin-top: 24px; padding: 16px; background-color: rgba(248, 113, 113, 0.08); border-left: 4px solid #f87171; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; color: #fca5a5; line-height: 1.5;">
                        <strong>Security Notice:</strong> If you did not make this request from your profile page, please ignore this email and check your account security immediately.
                    </p>
                </div>
            </td>
        </tr>

        <!-- Footer -->
        <tr>
            <td style="background-color: #0f141c; padding: 20px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                <p style="margin: 0;">&copy; {{ date('Y') }} Home Service Hub. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
