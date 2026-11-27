package fr.streamhub.app;

import android.content.Context;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ad blocker of the in-app browser window (SiteActivity), active only on the pages of the
 * sites the user added by hand (Settings > Mes sites vidéo). No site added: it does nothing.
 * It never touches other apps, and never YouTube, Google or the official streaming platforms,
 * even if one of them was added as a site.
 *
 * Domain list: AdGuard DNS filter (https://github.com/AdguardTeam/AdguardSDNSFilter, GPL-3.0),
 * downloaded at first start, saved in the app's files and refreshed once a week.
 * Only plain "||domain^" rules are used; "@@||domain^" exceptions are honoured.
 */
final class AdBlock {

    private static final String LIST_URL = "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt";
    private static final long MAX_AGE_MS = 7L * 24 * 3600 * 1000;

    /** Never blocked, and a page on one of these sites is not filtered at all. */
    private static final Set<String> ALLOW = new HashSet<>(Arrays.asList(
            "youtube.com", "youtu.be", "youtube-nocookie.com", "googlevideo.com", "ytimg.com", "google.com", "google.fr",
            "gstatic.com", "googleapis.com",
            "netflix.com", "nflxvideo.net", "nflximg.net", "primevideo.com", "amazon.com", "amazon.fr", "media-amazon.com",
            "disneyplus.com", "dssott.com", "bamgrid.com", "crunchyroll.com", "dailymotion.com", "dmcdn.net",
            "arte.tv", "france.tv", "francetv.fr", "tf1.fr", "m6.fr", "6play.fr", "twitch.tv", "ttvnw.net", "canalplus.com",
            "max.com", "hbomax.com", "apple.com", "paramountplus.com", "animationdigitalnetwork.com", "pluto.tv",
            "molotov.tv", "rakuten.tv", "lequipe.fr", "ina.fr", "deezer.com", "dzcdn.net", "spotify.com", "scdn.co",
            "spotifycdn.com", "themoviedb.org", "tmdb.org"));

    private static final Set<String> blocked = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private static final Set<String> exceptions = Collections.newSetFromMap(new ConcurrentHashMap<>());
    /** Domains of the sites added by the user ("example.com"), set from the web app. */
    private static final Set<String> userSites = Collections.newSetFromMap(new ConcurrentHashMap<>());
    static volatile boolean enabled = true;

    private AdBlock() {}

    static void setUserSites(Set<String> domains) {
        userSites.clear();
        userSites.addAll(domains);
    }

    /** True when the page shown is on a site the user added (and not an allowed platform). */
    static boolean filtersPage(String pageHost) {
        return enabled && pageHost != null && matches(pageHost, userSites) && !matches(pageHost, ALLOW);
    }

    /** A request from a filtered page: blocked when its host is on the list. */
    static boolean isBlocked(String host) {
        if (host == null) return false;
        if (matches(host, ALLOW) || matches(host, exceptions)) return false;
        return matches(host, blocked);
    }

    static int count() {
        return blocked.size();
    }

    /** Loads the saved list right away and refreshes it in the background when old or missing. */
    static void load(Context context) {
        File file = new File(context.getFilesDir(), "adguard-dns-filter.txt");
        new Thread(() -> {
            if (file.exists()) parseInto(file);
            if (!file.exists() || System.currentTimeMillis() - file.lastModified() > MAX_AGE_MS) {
                try {
                    download(file);
                    parseInto(file);
                } catch (Exception ignored) {
                    // Offline: keep the saved list, retry at next start.
                }
            }
        }).start();
    }

    /** The host or one of its parent domains is in the set (never the bare top-level domain). */
    private static boolean matches(String host, Set<String> set) {
        if (host == null) return false;
        String[] parts = host.toLowerCase().split("\\.");
        for (int i = 0; i < parts.length - 1; i++) {
            if (set.contains(join(parts, i))) return true;
        }
        return false;
    }

    private static void download(File file) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(LIST_URL).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(60000);
        File tmp = new File(file.getPath() + ".tmp");
        try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
            byte[] chunk = new byte[16384];
            int n;
            while ((n = in.read(chunk)) != -1) out.write(chunk, 0, n);
        }
        // A broken download must not replace a good list.
        if (tmp.length() < 100_000 || !tmp.renameTo(file)) {
            //noinspection ResultOfMethodCallIgnored
            tmp.delete();
        }
    }

    private static void parseInto(File file) {
        try (BufferedReader r = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = r.readLine()) != null) {
                boolean exception = line.startsWith("@@||");
                if (!exception && !line.startsWith("||")) continue;
                String rule = line.substring(exception ? 4 : 2);
                // Plain domain rules only: "example.com^", no options, paths or wildcards.
                if (!rule.endsWith("^")) continue;
                String domain = rule.substring(0, rule.length() - 1).toLowerCase();
                if (domain.isEmpty() || domain.contains("*") || domain.contains("/") || domain.contains("$")) continue;
                (exception ? exceptions : blocked).add(domain);
            }
        } catch (Exception ignored) {
            // Unreadable file: no blocking until the next download.
        }
    }

    private static String join(String[] parts, int from) {
        StringBuilder b = new StringBuilder(parts[from]);
        for (int i = from + 1; i < parts.length; i++) b.append('.').append(parts[i]);
        return b.toString();
    }
}
