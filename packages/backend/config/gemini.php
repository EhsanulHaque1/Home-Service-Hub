<?php

return [
    'api_key' => env('GEMINI_API_KEY', ''),
    'embed_model' => env('GEMINI_EMBED_MODEL', 'gemini-embedding-001'),
    'chat_model' => env('GEMINI_CHAT_MODEL', 'gemini-2.5-flash'),
    'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
];