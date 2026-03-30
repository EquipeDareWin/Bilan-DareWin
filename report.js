// api/report.js — Vercel Serverless Function
// La clé Anthropic reste côté serveur, jamais exposée au navigateur

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { scores, context, mode } = req.body;
  if (!scores || !context) return res.status(400).json({ error: "Missing data" });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "API key not configured" });

  const niveau = (score) => {
    const pct = (score - 10) / 30 * 100;
    if (pct >= 75) return "très élevé";
    if (pct >= 55) return "satisfaisant";
    if (pct >= 35) return "modéré";
    return "faible";
  };

  const fmt = (n) => Math.round(n * 10) / 10;

  const equilibreLabel = scores.motivation >= scores.hygiene
    ? "ce que votre travail vous apporte correspond globalement à ce que vous y investissez"
    : "vous avez le sentiment d'investir plus que ce que vous recevez en retour";

  const pressionLabel = scores.exigence >= 25
    ? scores.autonomie >= 25
      ? "vous faites face à beaucoup de sollicitations, mais vous disposez d'une vraie marge de manœuvre"
      : "vous ressentez une pression importante avec peu d'espace pour décider par vous-même"
    : scores.autonomie >= 25
      ? "votre environnement est peu contraignant et vous laisse une grande liberté d'action"
      : "votre travail est peu exigeant mais vous laisse aussi peu d'initiative";

  const equiteLabel = scores.equitePct >= 60
    ? "vous avez le sentiment d'être traité(e) de façon juste"
    : scores.equitePct >= 40
      ? "vous ressentez parfois un décalage entre ce que vous donnez et ce que vous recevez"
      : "vous avez nettement l'impression de ne pas être traité(e) à votre juste valeur";

  const pourquoiLabel = context.pourquoi === "Autre" ? context.pourquoiAutre : context.pourquoi;
  const contextePassation = pourquoiLabel === "À ma propre initiative"
    ? "valorise la démarche personnelle et l'autonomie réflexive du répondant"
    : pourquoiLabel?.includes("entretien")
      ? "adopte un ton constructif orienté dialogue avec l'entreprise"
      : pourquoiLabel?.includes("collective")
        ? "insiste sur la dimension collective et la cohésion d'équipe"
        : pourquoiLabel?.includes("manager")
          ? "encourage l'appropriation personnelle, même si la démarche vient de l'extérieur"
          : "reste neutre et bienveillant";

  const prompt = `Tu es un expert en bien-être au travail et développement professionnel. Tu rédiges un bilan personnel de motivation, chaleureux, accessible et profondément personnalisé, en français, en FORMAT HTML.

RÈGLES ABSOLUES :
1. ZÉRO jargon théorique. Jamais : Vroom, Herzberg, Karasek, Adams, Maslow, "score", "dimension", "théorie", "instrumentalité", "valence", "hygiène".
2. Deuxième personne (vous), ton direct et bienveillant, comme un coach de confiance.
3. Personnalise CHAQUE paragraphe au poste "${context.poste}" dans le secteur "${context.secteur}" avec ${context.anciennete} d'ancienneté. Exemples concrets tirés de ce métier.
4. Longueur : 4000 mots minimum.
5. Préconisations : ton précautionneux (vous pourriez, il serait peut-être utile, nous vous encourageons à…).
6. Format HTML : <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <hr>, <blockquote>. PAS de html/head/body/style/script. PAS de markdown.
7. Contexte de passation : ${contextePassation}.

PROFIL :
- Rôle : ${mode === "dirigeant" ? "Décideur / DRH" : "Salarié"}
- Poste : ${context.poste} | Secteur : ${context.secteur} | Ancienneté : ${context.anciennete} | Taille : ${context.taille}
- Raison du bilan : ${pourquoiLabel}

DONNÉES (pour usage interne uniquement — ne pas citer les chiffres bruts) :
- Investissement au travail : ${niveau(scores.hygiene)}
- Ce que le travail apporte : ${niveau(scores.motivation)}
- Pression ressentie : ${niveau(scores.exigence)}
- Liberté d'agir : ${niveau(scores.autonomie)}
- Soutien professionnel : ${niveau(scores.soutien)}
- Sentiment d'équité : ${scores.equitePct}%
- Confiance efforts → résultats : ${niveau(scores.exp)}
- Confiance résultats → récompenses : ${niveau(scores.inst)}
- Sens accordé au travail : ${niveau(scores.val)}
- Besoins de base : ${niveau(scores.physio)} / Sécurité : ${niveau(scores.securite)}
- Appartenance : ${niveau(scores.appartenance)} / Estime : ${niveau(scores.estime)} / Accomplissement : ${niveau(scores.accomp)}
- Motivation globale : ${scores.vroomRatio}%

INTERPRÉTATIONS CLÉS :
- Équilibre : ${equilibreLabel}
- Pression/autonomie : ${pressionLabel}
- Équité : ${equiteLabel}

STRUCTURE OBLIGATOIRE :

<h1>Votre bilan de motivation au travail</h1>
<h2>Ce que ce bilan dit de vous en quelques mots</h2>
[Introduction chaleureuse, 4 paragraphes. Contextualisée pour ${context.poste} dans ${context.secteur}. Présente 2-3 forces et 2-3 points d'attention en langage de vie professionnelle. Jamais de jugement.]

<h1>1. Ce que révèle votre bilan</h1>

<h2>🔋 Votre énergie au travail</h2>
[Ce que le répondant investit et reçoit. Exemples concrets du poste. 4 paragraphes denses.]

<h2>🎯 Votre sens et vos ambitions</h2>
[Sens du travail, confiance dans les résultats, envie d'avancer. 4 paragraphes très personnalisés.]

<h2>🤝 Vos relations et votre environnement</h2>
[Pression, liberté d'agir, soutien de l'entourage. 3 paragraphes.]

<h2>⚖️ Ce que vous donnez, ce que vous recevez</h2>
[Sentiment de justice, reconnaissance, rémunération, opportunités. 3 paragraphes.]

<h2>🚀 Votre confiance en l'avenir professionnel</h2>
[Sécurité, perspectives, développement. 3 paragraphes adaptés à ${context.secteur} et taille ${context.taille}.]

<h1>2. Ce que tout cela signifie concrètement</h1>

<h2>Vos points forts à valoriser</h2>
[3-4 forces réelles, chacune en <strong>titre</strong> + explication + exemple ancré dans le poste.]

<h2>Les points d'attention à ne pas laisser s'installer</h2>
[3-4 zones de vigilance, ton bienveillant. Risques concrets si non traités. 3 paragraphes.]

<h2>Comment tout cela s'articule dans votre quotidien</h2>
[Synthèse narrative 4-5 paragraphes, projection dans le temps. Très personnalisée.]

<h1>3. Des pistes pour avancer</h1>
<p><em>Ces pistes sont formulées à partir de votre propre perception. Elles ne remplacent pas un échange avec votre manager ou un accompagnateur. Certaines sont peut-être déjà en place.</em></p>

<h2>🔋 Pour retrouver ou préserver votre énergie</h2>
[3-4 pistes. Chacune : <strong>titre</strong> + 3-4 lignes. Deux niveaux : "Ce que VOUS pouvez faire" et "Ce que votre MANAGER ou ENTREPRISE pourrait mettre en place". Ton précautionneux. Outils concrets adaptés à la taille ${context.taille}.]

<h2>🎯 Pour renforcer le sens et vos ambitions</h2>
[3-4 pistes. Même structure. Outils : entretien annuel centré projet pro, plan développement individuel, bilan de compétences, etc.]

<h2>🤝 Pour nourrir vos relations professionnelles</h2>
[3-4 pistes. Rituels d'équipe, co-développement, intelligence collective, etc.]

<h2>⚖️ Pour un meilleur sentiment de justice et de reconnaissance</h2>
[3-4 pistes. Transparence, grille d'évaluation, valorisation des réussites, etc.]

<h2>🚀 Pour construire votre avenir professionnel avec confiance</h2>
[3-4 pistes. Parcours carrière, référentiel de compétences, formation certifiante, mobilité interne, etc.]

<h1>Pour finir — un mot pour vous</h1>
[Conclusion chaleureuse 3 paragraphes. Forces rappelées. Encourage à agir sur 1-2 points prioritaires. Phrase finale positive ancrée dans le réel du poste et secteur.]`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    res.status(200).json({ report: text });
  } catch (err) {
    res.status(500).json({ error: "Erreur de génération", details: err.message });
  }
}
