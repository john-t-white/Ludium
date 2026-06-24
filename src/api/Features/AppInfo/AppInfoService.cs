namespace Ludium.Api.Features.AppInfo;

public class AppInfoService(IConfiguration configuration)
{
    public AppInfoResponse GetAppInfo()
    {
        var appName = configuration["App:Name"];
        if (string.IsNullOrWhiteSpace(appName))
        {
            appName = "Ludium";
        }

        return new AppInfoResponse(appName);
    }
}
