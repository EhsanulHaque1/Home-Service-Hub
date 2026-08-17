<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $sub }}</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Home Service Hub</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px 24px;">
                <h2 style="margin-top: 0; color: #1e293b; font-size: 20px;">{{ $sub }}</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #475569;">{{ $msg }}</p>
                
                @if(!empty($verificationUrl))
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{{ $verificationUrl }}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">{{ $buttonText ?? 'Verify Email Address' }}</a>
                    </div>
                    <p style="font-size: 14px; color: #64748b; line-height: 1.4;">
                        If the button above does not work, copy and paste the following URL into your web browser:
                    </p>
                    <p style="font-size: 13px; color: #2563eb; word-break: break-all;">
                        <a href="{{ $verificationUrl }}" style="color: #2563eb;">{{ $verificationUrl }}</a>
                    </p>
                @endif
            </td>
        </tr>
        <tr>
            <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0;">If you did not create an account on Home Service Hub, no further action is required.</p>
            </td>
        </tr>
    </table>
</body>
</html>
