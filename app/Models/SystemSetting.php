<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Cache;
use Throwable;

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'group',
        'is_encrypted',
        'description',
    ];

    protected $casts = [
        'is_encrypted' => 'boolean',
    ];

    /**
     * Get a setting value by key with optional fallback.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("system_setting_{$key}", 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            if (!$setting || $setting->value === null || $setting->value === '') {
                return $default;
            }

            if ($setting->is_encrypted) {
                try {
                    return Crypt::decryptString($setting->value);
                } catch (Throwable $e) {
                    return $default;
                }
            }

            return $setting->value;
        });
    }

    /**
     * Set / Update a setting value by key.
     */
    public static function set(string $key, mixed $value, string $group = 'general', bool $isEncrypted = false, ?string $description = null): self
    {
        $storedValue = $value;
        if ($isEncrypted && $value !== null && $value !== '') {
            $storedValue = Crypt::encryptString((string)$value);
        }

        $setting = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storedValue,
                'group' => $group,
                'is_encrypted' => $isEncrypted,
                'description' => $description,
            ]
        );

        Cache::forget("system_setting_{$key}");
        Cache::forget("system_settings_group_{$group}");

        return $setting;
    }

    /**
     * Get all settings in a group as key => decrypted value array.
     */
    public static function getGroup(string $group): array
    {
        return Cache::remember("system_settings_group_{$group}", 3600, function () use ($group) {
            $settings = static::where('group', $group)->get();
            $result = [];
            foreach ($settings as $s) {
                if ($s->is_encrypted && $s->value) {
                    try {
                        $result[$s->key] = Crypt::decryptString($s->value);
                    } catch (Throwable $e) {
                        $result[$s->key] = null;
                    }
                } else {
                    $result[$s->key] = $s->value;
                }
            }
            return $result;
        });
    }
}
