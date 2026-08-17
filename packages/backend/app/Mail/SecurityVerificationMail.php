<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SecurityVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $user;
    public string $code;
    public string $action;
    public string $actionLabel;
    public int $expiresInMinutes;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $code, string $action, int $expiresInMinutes = 10)
    {
        $this->user = $user;
        $this->code = $code;
        $this->action = $action;
        $this->expiresInMinutes = $expiresInMinutes;
        $this->actionLabel = $action === 'delete_account' ? 'Delete Account' : 'Change Password';
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->action === 'delete_account'
            ? "Your Security Code to Delete Account - Home Service Hub"
            : "Your Security Code to Change Password - Home Service Hub";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.security-code',
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [];
    }
}
