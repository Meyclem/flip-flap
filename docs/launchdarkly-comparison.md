# Flip-Flap vs LaunchDarkly -- Comparaison

## Pricing LaunchDarkly

| Plan | Prix | Limites / Inclus |
|------|------|------------------|
| **Developer** (gratuit) | $0/mois | 1 projet, 3 environnements, 5 connexions serveur, 1 000 MAU client |
| **Foundation** | $12/connexion serveur/mois ($10 annuel) | Sièges illimités, projets & environnements illimités, SSO, Experimentation. Client MAU : +$10/1 000 utilisateurs/mois |
| **Enterprise** | Sur devis (~$19 500 -- $165 700/an, médiane ~$72 000/an) | Foundation + SAML/SCIM, rôles personnalisés, équipes, pipelines de release, workflows d'approbation, flag scheduling. Clause d'augmentation de 7%/an |
| **Guardian** | Sur devis (premium) | Enterprise + monitoring avancé, guarded rollouts à grande échelle, garanties de fiabilité maximales |

---

## Comparaison des fonctionnalités

| Fonctionnalité | Flip-Flap | LaunchDarkly |
|---|---|---|
| **Feature flags booléens** | Oui | Oui |
| **Flags multivariés** (string, number, JSON) | Non (booléen uniquement) | Oui |
| **Rollout progressif (%)** | Oui (hash déterministe MD5) | Oui (hash déterministe) |
| **Phases temporelles** (start/end date) | Oui | Oui (scheduled flag changes) |
| **Ciblage par attributs utilisateur** | Oui (userId, location, accountAge, champs custom) | Oui (attributs illimités, contextes custom) |
| **Opérateurs de ciblage** | eq, neq, gt, gte, lt, lte, oneOf, notOneOf | Tous les précédents + contains, startsWith, endsWith, regex, semver, date comparisons |
| **Logique de règles** | AND uniquement | AND + OR, combinaisons complexes |
| **Segments réutilisables** | Non | Oui (segments sauvegardés, import depuis analytics) |
| **Ciblage individuel** | Via contextRules (eq sur userId) | Oui (targeting par utilisateur individuel natif) |
| **Custom context kinds** | Non (user uniquement) | Oui (organisations, devices, etc.) |
| **Multi-environnement** | Oui (dev, staging, prod) | Oui (illimité) |
| **Multi-tenant / organisations** | Oui | Oui (projets) |
| **Prérequis entre flags** | Non | Oui (dépendances parent-enfant) |
| **Guarded rollouts** (rollback auto sur régression) | Non | Oui (détection statistique, rollback auto, notifications) |
| **A/B testing / Experimentation** | Non | Oui (natif, testing séquentiel, métriques conversion/numeric) |
| **Release pipelines** | Non | Oui (phases automatisées à travers les environnements) |
| **Workflows d'approbation** | Non | Oui (Enterprise+) |
| **Scheduled flag changes** | Phases avec dates | Oui (scheduling ponctuel) |
| **Audit logs** | Non | Oui |
| **SSO / SAML / SCIM** | Non | Oui (Foundation+ / Enterprise+) |
| **Rôles et permissions** (RBAC) | Non | Oui (rôles custom Enterprise+) |
| **Webhooks** | Non (prévu) | Oui |
| **Flag triggers** (toggle auto via alertes externes) | Non | Oui (Datadog, PagerDuty, etc.) |
| **AI Config** | Non | Oui |
| **Dashboard / UI web** | Non (prévu) | Oui (complet) |
| **API REST** | Oui | Oui |
| **Caching** | In-memory (60s TTL) | Streaming temps réel (sub-200ms) |
| **Évaluation fail-safe** | Oui (retourne false) | Oui (valeur par défaut configurable) |

---

## SDKs

| Type | Flip-Flap | LaunchDarkly |
|---|---|---|
| **Server-side** | API HTTP uniquement (pas de SDK) | Go, Java, .NET, Node.js, Python, Ruby, PHP, Erlang, etc. |
| **Client-side** | Aucun | JavaScript, React, Vue, Electron, .NET, C++ |
| **Mobile** | Aucun | Android, iOS, Flutter, React Native, Roku |
| **Edge** | Aucun | Akamai, Cloudflare, Fastly, Vercel |
| **AI** | Aucun | SDKs AI Config dédiés |

---

## Intégrations

| Catégorie | Flip-Flap | LaunchDarkly |
|---|---|---|
| **Observabilité** | Aucune | Datadog, Dynatrace, Grafana, Honeycomb, New Relic, Splunk, OpenTelemetry, PagerDuty, Last9, Mezmo |
| **CI/CD** | Aucune | GitHub, GitLab, CircleCI, code references |
| **Collaboration** | Aucune | Slack, Microsoft Teams, Jira |
| **Infrastructure as Code** | Aucune | Terraform provider officiel |
| **Base de données** | MongoDB | N/A (SaaS managé) |

---

## Architecture

| Aspect | Flip-Flap | LaunchDarkly |
|---|---|---|
| **Modèle** | Self-hosted, API REST | SaaS managé |
| **Mise à jour des flags** | Polling (cache 60s TTL) | Streaming temps réel (SSE) |
| **Latence d'évaluation** | Dépend du cache (0ms si cache, sinon requête DB) | Sub-200ms (évaluation locale via SDK + streaming) |
| **Évaluation** | Côté serveur (API call) | Côté client via SDK (évaluation locale après sync) |
| **Scalabilité** | Cache in-memory, MongoDB | Infrastructure distribuée globale, CDN edge |
| **Disponibilité** | Dépend de l'infra utilisateur | SLA 99.99% (Enterprise) |

---

## Avantages de Flip-Flap

- **Gratuit et self-hosted** : pas de coût de licence, contrôle total des données
- **Simple à déployer** : Node.js + MongoDB, docker-compose
- **Léger** : pas de complexité superflue pour les cas simples
- **Personnalisable** : code source accessible, adaptable aux besoins spécifiques
- **Pas de vendor lock-in** : pas de dépendance à un SaaS
- **Phases temporelles natives** : rollout progressif avec dates intégrées

## Avantages de LaunchDarkly

- **Produit mature** : plateforme complète, battle-tested à grande échelle
- **SDKs natifs** : 25+ SDKs pour tous les langages et plateformes
- **Streaming temps réel** : mise à jour des flags en sub-200ms sans polling
- **Experimentation native** : A/B testing avec moteur statistique intégré
- **Guarded rollouts** : rollback automatique sur détection de régression
- **Gouvernance** : audit logs, RBAC, workflows d'approbation, SSO/SAML
- **Écosystème d'intégrations** : Datadog, Terraform, Slack, Jira, etc.
- **UI complète** : dashboard de gestion, monitoring, analytics

---

## Conclusion

**Flip-Flap** couvre les besoins essentiels du feature flagging (flags booléens, rollout progressif, ciblage par contexte, multi-environnement) dans un package léger et self-hosted. C'est adapté aux équipes qui veulent une solution simple, gratuite et sans dépendance externe.

**LaunchDarkly** est une plateforme enterprise complète avec un écosystème riche (SDKs, intégrations, experimentation, gouvernance). Le prix est significatif : minimum ~$120/mois pour Foundation, et $20K-$165K/an pour Enterprise.

Les axes de différenciation principaux pour Flip-Flap par rapport à LaunchDarkly :
1. **Coût** : gratuit vs $120+/mois
2. **Souveraineté des données** : self-hosted vs SaaS
3. **Simplicité** : API légère vs plateforme complexe

Les fonctionnalités majeures manquantes dans Flip-Flap pour rivaliser :
1. SDKs natifs (au minimum Node.js, Python, Go)
2. UI web de gestion
3. Flags multivariés
4. Streaming temps réel
5. Experimentation / A/B testing
6. Audit logs et RBAC
