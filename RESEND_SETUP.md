# Resend email setup

1. In Resend, verify the domain used by `RESEND_FROM_EMAIL`.
2. Create a sending-only API key and add it to the server environment as `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to an address on that verified domain, for example `CompSmooth <no-reply@example.com>`.

The OTP endpoint sends email after creating the OTP record. If Resend cannot accept the message, that record is immediately invalidated and the request fails, preventing an OTP that the user cannot receive.
