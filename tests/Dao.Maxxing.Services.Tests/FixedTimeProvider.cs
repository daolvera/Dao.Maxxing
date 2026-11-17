namespace Dao.Maxxing.Services.Tests;

/// <summary>A clock stopped at <paramref name="now"/>, so tests don't depend on the real time.</summary>
internal sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
    public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
}
