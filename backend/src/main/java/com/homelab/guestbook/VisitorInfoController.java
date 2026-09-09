package com.homelab.guestbook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/visitor")
@CrossOrigin
public class VisitorInfoController {

    private final ObjectMapper objectMapper;

    public VisitorInfoController(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public Map<String, Object> getVisitorInfo(HttpServletRequest request) {
        String ip = resolveClientIp(request);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ip", ip);

        Map<String, Object> geo = lookup(ip);
        result.put("location", geo);

        result.put("userAgent", request.getHeader("User-Agent"));
        result.put("forwarded", resolveForwardedHeaders(request));
        result.put("resolvedAt", Instant.now().toString());

        return result;
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Traefik sets X-Forwarded-For; take the original client, not proxies.
        // Prefer an IPv4 address when the chain contains both, since it reads
        // more cleanly than a long IPv6 literal.
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String ipv6 = null;
            for (String part : xff.split(",")) {
                String candidate = part.trim();
                if (candidate.isEmpty()) {
                    continue;
                }
                if (candidate.contains(":")) {
                    if (ipv6 == null) {
                        ipv6 = candidate;
                    }
                    continue;
                }
                return candidate; // first IPv4 wins
            }
            if (ipv6 != null) {
                return ipv6;
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }

    private Map<String, Object> resolveForwardedHeaders(HttpServletRequest request) {
        Map<String, Object> headers = new LinkedHashMap<>();
        putIfPresent(headers, "x-forwarded-for", request.getHeader("X-Forwarded-For"));
        putIfPresent(headers, "x-real-ip", request.getHeader("X-Real-IP"));
        putIfPresent(headers, "x-forwarded-proto", request.getHeader("X-Forwarded-Proto"));
        putIfPresent(headers, "x-forwarded-host", request.getHeader("X-Forwarded-Host"));
        return headers;
    }

    private void putIfPresent(Map<String, Object> map, String key, String value) {
        if (value != null && !value.isBlank()) {
            map.put(key, value);
        }
    }

    private Map<String, Object> lookup(String ip) {
        Map<String, Object> geo = new LinkedHashMap<>();
        // Don't try to geolocate private/loopback addresses.
        if (isPrivateAddress(ip)) {
            geo.put("status", "private");
            geo.put("message", "Private or reserved address - not geolocatable");
            return geo;
        }

        try {
            var client = java.net.http.HttpClient.newBuilder()
                    .connectTimeout(java.time.Duration.ofSeconds(3))
                    .build();
            var req = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(
                            "http://ip-api.com/json/" + ip
                                    + "?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query"))
                    .timeout(java.time.Duration.ofSeconds(4))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            String body = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString()).body();
            JsonNode node = objectMapper.readTree(body);

            if ("success".equals(node.path("status").asText())) {
                geo.put("status", "success");
                geo.put("country", node.path("country").asText(null));
                geo.put("region", node.path("regionName").asText(null));
                geo.put("city", node.path("city").asText(null));
                geo.put("zip", node.path("zip").asText(null));
                geo.put("latitude", node.path("lat").asDouble());
                geo.put("longitude", node.path("lon").asDouble());
                geo.put("timezone", node.path("timezone").asText(null));
                geo.put("isp", node.path("isp").asText(null));
                geo.put("org", node.path("org").asText(null));
                geo.put("asn", node.path("as").asText(null));
            } else {
                geo.put("status", "failed");
                geo.put("message", node.path("message").asText("Unknown lookup error"));
            }
        } catch (Exception e) {
            geo.put("status", "error");
            geo.put("message", e.getMessage());
        }
        return geo;
    }

    private boolean isPrivateAddress(String ip) {
        if (ip == null) {
            return true;
        }
        String[] parts = ip.split("\\.");
        if (parts.length != 4) {
            // IPv6 loopback or anything non-IPv4 - keep it simple.
            return ip.startsWith("::1") || ip.startsWith("fe80:") || ip.equals("0:0:0:0:0:0:0:1");
        }
        try {
            int a = Integer.parseInt(parts[0]);
            int b = Integer.parseInt(parts[1]);
            if (a == 10) return true;
            if (a == 127) return true;
            if (a == 0) return true;
            if (a == 172 && b >= 16 && b <= 31) return true;
            if (a == 192 && b == 168) return true;
            if (a == 100 && b >= 64 && b <= 127) return true; // CGNAT
            return false;
        } catch (NumberFormatException e) {
            return true;
        }
    }
}
