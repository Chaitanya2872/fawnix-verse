# HirePath ? Fawnix Verse Migration Log

Branch: modules/hrms

## 2026-03-24
- Initialized migration log.
- Copied HirePath services into Fawnix backend/services.
- Added HirePath service modules to backend/pom.xml.
- Standardized HirePath services on Fawnix Spring Boot 3.3.5 + Java 17 baseline, Flyway, and JWT config.
- Added shared security stack to HirePath services and removed legacy security configs.
- Added Flyway migrations for org, forms, approval, recruitment, integration, analytics, notifications.
- Added identity roles for HR/recruitment, updated role resolver, and added internal user summary + role update endpoint.
- Updated API Gateway routes for all HirePath services.
- Extended docker compose to include HirePath services, Redis, and new service databases.
- Merged HirePath frontend modules, utilities, Tailwind tokens, and routes into Fawnix UI shell.
- Swapped HirePath controllers to use AppUserDetails instead of OAuth2 Jwt principals.
- Updated recruitment UserContext and removed JwtAuthenticationToken propagation from Feign config.
