<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'vnnox' => [
        'base_url' => env('VNNOX_BASE_URL', 'https://open-eu.vnnox.com'),
        'app_key' => env('VNNOX_APP_KEY'),
        'app_secret' => env('VNNOX_APP_SECRET'),
    ],

    'foxlogger' => [
        'email' => env('FOXLOGGER_EMAIL', env('EMAIL_LOGFLOGGER', '')),
        'password' => env('FOXLOGGER_PASSWORD', env('PASSWORD_LOGFLOGGER', '')),
    ],

    'holowits' => [
        'truck_1' => [
            'nvr_ip' => env('HOLOWITS_T1_IP', '31.58.158.133'),
            'http_port' => (int) env('HOLOWITS_T1_HTTP_PORT', 70),
            'rtsp_port' => (int) env('HOLOWITS_T1_RTSP_PORT', 70),
            'username' => env('HOLOWITS_T1_USER', 'admin'),
            'password' => env('HOLOWITS_T1_PASS', ''),
        ],
        'truck_2' => [
            'nvr_ip' => env('HOLOWITS_T2_IP', '151.242.116.16'),
            'http_port' => (int) env('HOLOWITS_T2_HTTP_PORT', 70),
            'rtsp_port' => (int) env('HOLOWITS_T2_RTSP_PORT', 70),
            'username' => env('HOLOWITS_T2_USER', 'admin'),
            'password' => env('HOLOWITS_T2_PASS', ''),
        ],
    ],

];
