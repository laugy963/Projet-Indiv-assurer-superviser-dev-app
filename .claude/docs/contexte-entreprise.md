# Contexte : La Petite Maison de l'Épouvante

Source : `Contexte et Consigne - Indiv/contexte_PetiteMaisonEpouvante.pdf` (V1, 6 mars 2025). Sujet fictif : on peut ajouter des exigences si elles restent cohérentes avec le contexte.

## Entreprise

- Fondée il y a un peu moins de 10 ans par cinq passionnés d'horreur ; deux anciens d'ESN (un administrateur systèmes et réseaux, un architecte de solution).
- Fanzine horreur, fantastique, heroic fantasy : papier et numérique, 4 numéros par an, sur abonnement.
- Magasins à Angoulême, Aix-en-Provence, Lyon, et Londres depuis l'an dernier (« the little house of thrill »). Le texte cite aussi un magasin de Paris (station graphique, serveur de fichiers) : incohérence de la source, à traiter comme un site parisien.
- Produits dérivés : goodies, DVD / Blu-ray, BD, jeux de société.
- Petit Festival de l'Épouvante, chaque année depuis 5 ans : projections, ventes, masterclasses, tournois.
- Evil Ed : collectif de production et d'édition financé par crowdfunding. Web série « L'Orc » et sa BD en cours, deux séries en pré-production, restauration et authoring Blu-ray d'un film italien inédit. Site vitrine propre.

## SI existant (matière de l'audit, étape 8)

- « SI » hétérogène et fragmenté, géré par un technicien, aidé ponctuellement par les deux anciens de l'IT.
- Site vitrine sur CMS : abonnement au fanzine et newsletter, pas de vente en ligne.
- Applications hébergées chez un fournisseur cloud français : gestion de stock, gestion des fournisseurs, CRM.
- Échanges de données manuels par fichiers CSV. LibreOffice, messagerie Gmail, postes Ubuntu, une station Mac (création du fanzine et des newsletters).
- Une caisse et un stock par magasin ; transferts d'articles entre magasins en cas de rupture ; transporteur La Poste.
- Serveur de fichiers Ubuntu dans le site parisien, accessible en VPN, sauvegardé avec Veeam.
- Evil Ed : infrastructure média locale dans son bureau parisien (stations de montage et d'authoring, serveur multimédia de grande capacité redondé sur 2 nœuds).

## Équipe IT

- Un architecte logiciel ex-lead developer (l'étudiant, en évaluation individuelle), deux développeurs juniors (5 ans d'alternance). Recrutements possibles.

## Exigences de petitemaisonepouvante.com

- Vente en ligne des produits des magasins (figurines, jeux, Blu-ray…), plus des figurines Evil Ed vendues en exclusivité sur le site.
- Vente de numéros numérisés du fanzine, lisibles dans une liseuse intégrée à l'espace authentifié.
- Abonnement ou renouvellement au fanzine (papier et numérique).
- Recommandation de produits selon les recherches et les achats.
- Espace communautaire de troc, d'échange et de don entre particuliers :
  - un membre propose une liste de goodies à échanger ou à donner ;
  - notification automatique des inscrits quand un article correspond à leurs centres d'intérêt, idéalement aussi selon leur navigation ;
  - modération.
- Espace dédié de l'utilisateur authentifié : articles proposés et recherchés, réglage des notifications et recommandations, chat entre passionnés, suivi et historique des achats.
- News et articles de fond accessibles à tout internaute.
- Interface fluide, ergonomique, conforme au RGAA.
- Hébergement en Europe.
- Sécurité : contrainte forte, plateforme commerciale.

## Évolutions annoncées

- v2 : enchères façon eBay ; diffusion des productions d'Evil Ed.
- v3 (éventuelle) : diffusion en ligne des films du festival en mode restreint (places limitées, plages horaires fixes).
