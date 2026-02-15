# Cron Jobs

This directory contains Vercel Cron Jobs for scheduled tasks.

## Daily Digest Cron Job

**Endpoint**: `/api/cron/daily-digest`  
**Schedule**: Every day at 21:00 SGT (13:00 UTC)  
**Requirements**: 6.1, 6.8

### What it does

1. Fetches all active users with health profiles
2. Generates daily health summaries for each user
3. Sends personalized digest messages via WhatsApp
4. Respects user's custom digest time preferences
5. Skips users with no meals recorded

### Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 13 * * *"
    }
  ]
}
```

**Schedule Format**: Cron expression (minute hour day month dayOfWeek)
- `0 13 * * *` = Every day at 13:00 UTC (21:00 SGT)

### Security

The cron job is protected by a secret token:

```typescript
Authorization: Bearer <CRON_SECRET>
```

Set the `CRON_SECRET` environment variable in Vercel:

```bash
vercel env add CRON_SECRET
```

### Response Format

```json
{
  "success": true,
  "date": "2024-01-15",
  "duration": 12500,
  "results": {
    "total": 100,
    "success": 95,
    "failed": 2,
    "skipped": 3,
    "errors": [
      {
        "userId": "user-123",
        "error": "WhatsApp API error"
      }
    ]
  }
}
```

### Manual Testing

You can manually trigger the cron job using curl:

```bash
curl -X POST https://your-domain.vercel.app/api/cron/daily-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or using the Vercel CLI:

```bash
vercel cron trigger /api/cron/daily-digest
```

### Monitoring

The cron job logs detailed information:

- **Start**: When the job begins
- **User Processing**: Success/failure for each user
- **Completion**: Total results and duration
- **Errors**: Detailed error messages for failed users

View logs in Vercel Dashboard:
1. Go to your project
2. Click "Logs" tab
3. Filter by "cron_started" or "cron_completed"

### Performance

- **Batch Size**: Processes all users in a single run
- **Rate Limiting**: 100ms delay between WhatsApp messages
- **Timeout**: 300 seconds (5 minutes) max duration
- **Memory**: 2048 MB allocated

For 1000 users:
- Estimated time: ~2 minutes
- Memory usage: ~500 MB
- WhatsApp API calls: ~950 (skipping users with no meals)

### Error Handling

The cron job handles errors gracefully:

1. **User-level errors**: Logged but don't stop processing
2. **System errors**: Logged and returned in response
3. **Rate limiting**: Automatic delays prevent API throttling
4. **Timeouts**: Vercel automatically terminates after 5 minutes

### Customization

Users can customize their digest time in their health profile:

```typescript
await profileManager.updateProfile(userId, {
  digest_time: '20:00:00' // 8 PM SGT
});
```

The cron job checks each user's preferred time and only sends if within 1 hour window.

### Future Enhancements

1. **Weekly Summaries**: Add weekly digest cron job
2. **Monthly Reports**: Generate monthly health reports
3. **Smart Timing**: Send digest at user's typical meal completion time
4. **Batch Processing**: Process users in batches for better scalability
5. **Retry Logic**: Retry failed sends after a delay
6. **A/B Testing**: Test different digest formats and timings

## Adding New Cron Jobs

To add a new cron job:

1. Create a new route file: `src/app/api/cron/[job-name]/route.ts`
2. Implement GET handler with cron secret verification
3. Add configuration to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/[job-name]",
      "schedule": "0 * * * *"
    }
  ]
}
```

4. Deploy to Vercel

## Cron Schedule Examples

```
0 * * * *     - Every hour
0 0 * * *     - Every day at midnight UTC
0 12 * * *    - Every day at noon UTC
0 0 * * 0     - Every Sunday at midnight UTC
0 0 1 * *     - First day of every month at midnight UTC
*/15 * * * *  - Every 15 minutes
```

## Vercel Cron Limits

- **Free Plan**: 1 cron job, runs once per day
- **Pro Plan**: Unlimited cron jobs, any schedule
- **Max Duration**: 300 seconds (5 minutes)
- **Max Memory**: 3008 MB

## Troubleshooting

### Cron not running

1. Check Vercel Dashboard > Cron Jobs
2. Verify schedule is correct in `vercel.json`
3. Check if cron is enabled for your project
4. Review logs for errors

### Authentication errors

1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check Authorization header format
3. Ensure secret matches between Vercel and your code

### Timeout errors

1. Reduce batch size
2. Optimize database queries
3. Add pagination for large user bases
4. Consider splitting into multiple cron jobs

### Rate limiting

1. Increase delay between API calls
2. Implement exponential backoff
3. Use batch API endpoints if available
4. Monitor API usage in provider dashboard
