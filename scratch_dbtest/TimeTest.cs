using System;

class TimeTest {
    static void Main() {
        var _istTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        var now = DateTimeOffset.UtcNow;
        var istNow = TimeZoneInfo.ConvertTime(now, _istTimeZone);
        
        // BUGGY CODE:
        var buggyNextRun = istNow.Date.AddHours(10); 
        
        // FIXED CODE:
        var nextRun = new DateTimeOffset(istNow.Date.AddHours(10), _istTimeZone.GetUtcOffset(istNow));
        
        Console.WriteLine($"istNow: {istNow}");
        Console.WriteLine($"buggyNextRun: {buggyNextRun}");
        Console.WriteLine($"nextRun: {nextRun}");
        
        Console.WriteLine($"istNow UTC: {istNow.UtcDateTime}");
        Console.WriteLine($"nextRun UTC: {nextRun.UtcDateTime}");
        
        var delay = nextRun - istNow;
        Console.WriteLine($"Delay hours: {delay.TotalHours}");
    }
}
