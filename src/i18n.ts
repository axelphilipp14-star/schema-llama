// Textes de l'interface, FR et EN (exigence E7 : aucun texte en dur dans les composants).
// Les fiches tirées des enquêtes arriveront en M5 (content/fr.json, content/en.json).
import { useStore, type Lang } from './store'
import { BOS_LABEL } from './data/trace'

const fr = {
  title: 'Llama 3.2 en 3D',
  q: (x: string) => `« ${x} »`,
  bos: '⟨début⟩',
  devTrace: (L: number) => `Trace de développement (Llama 3.2 1B, ${L} blocs). Les vrais nombres du 3B (28 blocs) arrivent du notebook Kaggle.`,
  hint: 'Glisse pour tourner, molette pour zoomer, survole pour lire une valeur, clique sur un bloc pour entrer dedans.',
  sentence: 'Phrase',
  tokensCount: (n: number) => `${n} tokens`,
  play: 'Lecture', pause: 'Pause', prev: 'Étape précédente', next: 'Étape suivante', restart: 'Recommencer',
  overview: 'Vue d’ensemble', follow: 'Suivre le token',
  speed: 'Vitesse',
  stepName: {
    tokens: 'Texte → tokens', embed: 'Tokens → vecteurs', block: (l: number, L: number) => `Bloc ${l} / ${L}`,
    norm: 'Normalisation finale', head: 'Tête de sortie', probs: 'Probabilités → token',
  },
  step: {
    tokens: (n: number, V: string) => `Le texte est découpé en ${n} tokens. Chaque token est un numéro dans un vocabulaire de ${V} entrées. Le premier, ⟨début⟩, est ajouté automatiquement.`,
    embed: (V: string, d: string) => `Chaque numéro sélectionne une ligne de la table d'embedding (${V} lignes × ${d} nombres). Le token devient un vecteur de ${d} nombres : c'est le « flux résiduel » qui va traverser tous les blocs.`,
    embedVec: (tok: string, d: number) => `Les 8 premiers des ${d} nombres du vecteur de « ${tok} » :`,
    block: (l: number) => `Bloc ${l}. ① L'attention mélange les tokens : chaque token récupère de l'information chez les précédents. ② Le MLP transforme chaque token seul. Les deux résultats s'ajoutent au flux, ils ne le remplacent pas.`,
    blockLooks: (tok: string, k: string, p: string, sink: string) => `Dans ce bloc, « ${tok} » regarde surtout « ${k} » (${p}, moyenne des têtes). ${sink} de son attention part sur ⟨début⟩, qui sert de « puits » quand rien d'autre n'est utile.`,
    blockLens: 'Si le modèle s’arrêtait à la sortie de ce bloc, il prédirait :',
    norm: 'Une dernière RMSNorm remet le vecteur du dernier token à la bonne échelle. Seul le dernier token sert à prédire le suivant.',
    normVals: (a: string, b: string) => `‖x‖ avant : ${a} → après : ${b}`,
    head: (V: string, tied: boolean) => `Le vecteur est comparé aux ${V} lignes de la table de sortie : un score (« logit ») par token possible.${tied ? ' Chez Llama 3.2, c’est la même table que celle de l’entrée.' : ''}`,
    headTop: 'Les 5 plus gros scores :',
    probs: 'La fonction softmax transforme les scores en probabilités qui somment à 100 %. Le modèle choisit ici le plus probable (température 0).',
    chosen: 'Token choisi',
  },
  lensTitle: 'La prédiction se forme, bloc après bloc',
  lensNote: 'Lu à la sortie de chaque bloc (« logit lens ») : top-1 et sa probabilité.',
  top10: 'Sortie finale (top-10)',
  sameTable: 'même table (entrée = sortie)',
  embTable: (V: string, d: string) => `table d’embedding ${V} × ${d}`,
  dimHover: (tok: string, j: number, d: number) => `« ${tok} » · dimension ${j} sur ${d}`,
  lensHover: (l: number) => `Bloc ${l} · lu à la sortie (logit lens)`,
  outTable: 'tête de sortie',
  finalNorm: 'RMSNorm',
  blockHover: (l: number) => `Bloc ${l}`,
  blockHoverVal: 'clic pour entrer dedans',
  rowHover: (tok: string, id: number) => `ligne ${id} de la table · token « ${tok} »`,
  rowHoverVal: (norm: string) => `‖vecteur‖ = ${norm}`,
  back: '← Retour au trajet',
  blockTitle: (l: number, L: number) => `Bloc ${l} / ${L}`,
  blockLensTitle: 'Lu à la sortie de ce bloc (logit lens)',
  layerLabel: 'Bloc',
  source: (dtype: string, date: string) => `Source : trace ${dtype}, ${date}. Couleurs de l'attention en échelle racine ; hauteurs du flux en échelle log.`,
  dims: (d: string, h: number, kv: number, m: string, V: string) => `Dimensions lues dans la trace : ${d} · ${h} têtes · ${kv} K/V · MLP ${m} · vocabulaire ${V}.`,
  builtWith: 'Built with Llama',
}

type Dict = typeof fr

const en: Dict = {
  title: 'Llama 3.2 in 3D',
  q: (x) => `“${x}”`,
  bos: '⟨start⟩',
  devTrace: (L) => `Development trace (Llama 3.2 1B, ${L} blocks). The real 3B numbers (28 blocks) are coming from the Kaggle notebook.`,
  hint: 'Drag to rotate, scroll to zoom, hover to read a value, click a block to step inside.',
  sentence: 'Sentence',
  tokensCount: (n) => `${n} tokens`,
  play: 'Play', pause: 'Pause', prev: 'Previous step', next: 'Next step', restart: 'Restart',
  overview: 'Overview', follow: 'Follow the token',
  speed: 'Speed',
  stepName: {
    tokens: 'Text → tokens', embed: 'Tokens → vectors', block: (l, L) => `Block ${l} / ${L}`,
    norm: 'Final normalization', head: 'Output head', probs: 'Probabilities → token',
  },
  step: {
    tokens: (n, V) => `The text is split into ${n} tokens. Each token is a number in a vocabulary of ${V} entries. The first one, ⟨start⟩, is added automatically.`,
    embed: (V, d) => `Each number selects one row of the embedding table (${V} rows × ${d} numbers). The token becomes a vector of ${d} numbers: the “residual stream” that will flow through every block.`,
    embedVec: (tok, d) => `The first 8 of the ${d} numbers in the vector for “${tok}”:`,
    block: (l) => `Block ${l}. ① Attention mixes the tokens: each token gathers information from the previous ones. ② The MLP transforms each token on its own. Both results are added to the stream; they do not replace it.`,
    blockLooks: (tok, k, p, sink) => `In this block, “${tok}” mostly looks at “${k}” (${p}, averaged over heads). ${sink} of its attention goes to ⟨start⟩, which acts as a “sink” when nothing else is useful.`,
    blockLens: 'If the model stopped at the output of this block, it would predict:',
    norm: 'A last RMSNorm rescales the vector of the last token. Only the last token is used to predict the next one.',
    normVals: (a, b) => `‖x‖ before: ${a} → after: ${b}`,
    head: (V, tied) => `The vector is compared with the ${V} rows of the output table: one score (“logit”) per possible token.${tied ? ' In Llama 3.2, it is the same table as the input one.' : ''}`,
    headTop: 'The 5 largest scores:',
    probs: 'Softmax turns the scores into probabilities that add up to 100%. Here the model picks the most likely one (temperature 0).',
    chosen: 'Chosen token',
  },
  lensTitle: 'The prediction takes shape, block after block',
  lensNote: 'Read at the output of each block (“logit lens”): top-1 and its probability.',
  top10: 'Final output (top-10)',
  sameTable: 'same table (input = output)',
  embTable: (V, d) => `embedding table ${V} × ${d}`,
  dimHover: (tok, j, d) => `“${tok}” · dimension ${j} of ${d}`,
  lensHover: (l) => `Block ${l} · read at the output (logit lens)`,
  outTable: 'output head',
  finalNorm: 'RMSNorm',
  blockHover: (l) => `Block ${l}`,
  blockHoverVal: 'click to step inside',
  rowHover: (tok, id) => `row ${id} of the table · token “${tok}”`,
  rowHoverVal: (norm) => `‖vector‖ = ${norm}`,
  back: '← Back to the journey',
  blockTitle: (l, L) => `Block ${l} / ${L}`,
  blockLensTitle: 'Read at the output of this block (logit lens)',
  layerLabel: 'Block',
  source: (dtype, date) => `Source: ${dtype} trace, ${date}. Attention colours on a square-root scale; stream heights on a log scale.`,
  dims: (d, h, kv, m, V) => `Dimensions read from the trace: ${d} · ${h} heads · ${kv} K/V · MLP ${m} · vocabulary ${V}.`,
  builtWith: 'Built with Llama',
}

export const dicts: Record<Lang, Dict> = { fr, en }

export function useT() {
  const lang = useStore((s) => s.lang)
  const t = dicts[lang]
  BOS_LABEL.current = t.bos
  const loc = lang === 'fr' ? 'fr-FR' : 'en-US'
  const num = (v: number, d = 2) => v.toLocaleString(loc, { maximumFractionDigits: d })
  const pct = (p: number, d = 1) => `${(p * 100).toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d })}${lang === 'fr' ? ' %' : '%'}`
  return { t, lang, num, pct }
}
