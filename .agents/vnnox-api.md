# NovaCloud / VNNOX API Access Guide

Source Documentation: [https://developer-en.vnnox.com/doc-4696857](https://developer-en.vnnox.com/doc-4696857)

---

## 1. Introduction

NovaCloud Open Platform serves as the foundation of the NovaCloud open ecosystem, offering users all-round content publishing, device management, and monitoring to facilitate the creation of intelligent digital content publishing solutions.

NovaCloud Open Platform provides capabilities for:
- **VNNOX Media APIs**: Focuses on content publishing and playback control (player list, player status, player operation control, content publishing control, play logs).
- **VNNOX Care APIs**: Focuses on monitoring the operating status of devices and screens (basic information, hardware status, monitoring data, alarms).
- **SSO Redirection**: Provides an interface to redirect users to VNNOX Media without requiring a password.

---

## 2. Features & Supported Devices

### Features
- Interface calling methods for content publishing (LED display content publishing control).
- Interface calling methods for monitoring and maintenance across the entire LED display link.
- API name search & online secret key management.
- Online API debugging tools.

### Supported Devices
- **Content Publishing APIs (VNNOX Media)**: TU / TB / T series
- **Monitoring APIs (VNNOX Care)**: MSD / MCTRL series, V / VX series, TU / TB / T series, MBOX series (>= V1.3)

### Preparation
1. Prepare supported devices.
2. For content publishing APIs: Bind devices to VNNOX Media via ViPlex Express or remotely.
3. For monitoring APIs: Bind devices to VNNOX Care via NovaLCT or import devices from VNNOX Media to VNNOX Care.
4. Sign up / log in to NovaCloud Open Platform.

---

## 3. Access & Authentication Procedure

### Step 1: Obtain Application Access Key (AK / AS)
- **AK (AppKey ID)**: Unique application access key ID identifying the user. (1 user has 1 AK).
- **AS (AppSecret)**: Secret access key used as a password to verify ownership of the AppKey.

> **Note**: AK and AS are obtained after signing up/logging into the correct regional node on NovaCloud Open Platform. Default basic permissions are granted upon login; full permissions require enterprise authentication.

---

### Step 2: Request URL Structure
NovaCloud request URLs are formed by combining:
`[Protocol] + [Service Domain Name] + [API Request Path]`

- **Protocol**: `https`
- **Service Domain Name Example**: `open-us.vnnox.com` / `openapi-us.vnnox.com`
- **API Request Path Example**: `/v2/player/list`
- **Complete URL Example**: `https://openapi-us.vnnox.com/v2/player/list`

---

### Step 3: Public Request Headers
Every API request must include authentication headers in string format:

| Header Parameter | Type | Description |
| --- | --- | --- |
| `AppKey` | String | Access Key ID |
| `Nonce` | String | Random string (8 to 64 characters, numbers/English letters only) |
| `CurTime` | String | Current UTC timestamp in seconds since Epoch (`00:00:00 UTC, Jan 1, 1970`). Must be within **5 minutes** of NovaCloud server time. |
| `CheckSum` | String | Request signature generated using `SHA256(AppSecret + Nonce + CurTime)` |

---

### Step 4: Generating Request Signature (`CheckSum`)

Formula:
```
CheckSum = SHA256(AppSecret + Nonce + CurTime)
```

#### Signature Implementation Examples

##### PHP
```php
// $curTime = (string)time();
function generateCheckSum(string $appSecret, string $nonce, string $curTime): string {
    $input = $appSecret . $nonce . $curTime;
    return hash('sha256', $input);
}
```

##### Python
```python
import hashlib
import time

# cur_time = str(int(time.time()))
def calculate_checksum(app_secret, nonce, cur_time):
    input_str = app_secret + nonce + cur_time
    return hashlib.sha256(input_str.encode('utf-8')).hexdigest()
```

##### Java
```java
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;

public class AuthUtils {
    // curTime = String.valueOf(System.currentTimeMillis() / 1000);
    public static String generateCheckSum(String appSecret, String nonce, String curTime) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String input = appSecret + nonce + curTime;
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}
```

##### Go
```go
import (
    "crypto/sha256"
    "encoding/hex"
)

// curTime = fmt.Sprint(time.Now().Unix())
func GenerateCheckSum(appSecret, nonce, curTime string) string {
    hash := sha256.Sum256([]byte(appSecret + nonce + curTime))
    return hex.EncodeToString(hash[:])
}
```

---

### Step 5: Assembling API Specific Parameters

- **GET Requests**: Pass business parameters in the URL query parameters (`Content-Type: application/x-www-form-urlencoded`).
- **POST Requests**: Pass business parameters in the request body as JSON (`Content-Type: application/json; charset=utf-8`).

---

### Step 6: Request & Response Examples

#### CheckSum Calculation Example
```js
AppKey: 12345678901234567890123456789012
AppSecret: 87654321fedcba0987654321fedcba09
Nonce: 1a2b3c4d
CurTime: 1688201200

CheckSum = SHA256(AppSecret + Nonce + CurTime)
         = SHA256("87654321fedcba0987654321fedcba091a2b3c4d1688201200")
         = f663157a0881e3345f20d7bcc3ee82d871ec5ac804fff2e5527c396081a8fce2
```

#### cURL Request
```bash
curl -X GET \
  -H 'AppKey: 12345678901234567890123456789012' \
  -H 'Nonce: 1a2b3c4d' \
  -H 'CurTime: 1688201200' \
  -H 'CheckSum: f663157a0881e3345f20d7bcc3ee82d871ec5ac804fff2e5527c396081a8fce2' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  'https://openapi-us.vnnox.com/v2/player/list?count=10'
```

#### Successful Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
```

#### Failed Response
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
Content-Length: 108

{
  "error": {
    "code": "INVALID_APPKEY",
    "message": "The AppKey provided does not exist in our system"
  }
}
```

---

## 4. Rate Limits

To ensure system stability, NovaCloud enforces IP-based rate limiting:
- **Instantaneous Limit**: Max **15 calls per second** per IP address.
- **Cumulative Limit**: Max **1,500 calls per hour** per IP address.

Exceeding limits returns HTTP status `429 Too Many Requests`.

---

## 5. Common HTTP Status Codes

| Status Code | Name | Description |
| --- | --- | --- |
| `200` | OK | Request succeeded. |
| `400` | Bad Request | Syntax or parameter error that the server cannot process. |
| `401` | Unauthorized | Request authentication failed (invalid AppKey, signature, or timestamp drift > 5 mins). |
| `403` | Forbidden | Permission denied (e.g. enterprise authentication required). |
| `406` | Not Acceptable | Parameter validation failed. |
| `429` | Too Many Requests | Rate limit exceeded. |
| `500` | Internal Server Error | Server internal failure. |
| `501` | Not Implemented | Functionality not supported by server. |
| `502` | Bad Gateway | Invalid response from downstream service. |
| `503` | Service Unavailable | Server temporarily unavailable. |
| `504` | Gateway Timeout | Downstream server timed out. |
