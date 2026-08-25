using System;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        // wait, I don't have a token for recav1@edu.net. I'd have to login first.
        var client = new HttpClient();
        var loginData = new { Email = "recav1@edu.net", Password = "Sch@123" };
        var content = new StringContent(JsonSerializer.Serialize(loginData), Encoding.UTF8, "application/json");
        var loginRes = await client.PostAsync("http://localhost:5200/api/auth/login", content);
        var loginStr = await loginRes.Content.ReadAsStringAsync();
        Console.WriteLine(loginStr);
        // I need the token...
    }
}
