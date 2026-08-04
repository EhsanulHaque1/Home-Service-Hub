<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class MailController extends Controller
{
    public function sendEmail(Request $request)
    {
        $to = $request->input('email') ?? Auth::user()?->email ?? config('mail.from.address');
        $msg = $request->input('message') ?? 'Welcome to Home Service Hub! Thank you for joining us.';
        $subject = $request->input('subject') ?? 'Email Verification - Home Service Hub';

        Mail::to($to)->send(new WelcomeEmail($msg, $subject));

        return response()->json([
            'message' => 'Email sent successfully to ' . $to,
        ]);
    }
}
