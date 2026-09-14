/**
 * Script d'apparition au défilement.
 *
 * Volontairement écrit à la main plutôt qu'en composant React, et injecté en
 * tête de page : il pose la classe `js-reveal` **avant le premier rendu**. Un
 * composant client ne le pourrait pas — le HTML serveur arriverait visible,
 * l'hydratation le masquerait, et l'on verrait le contenu disparaître puis
 * revenir.
 *
 * Il ne dépend d'aucun module : même si le bundle de l'application échoue à se
 * charger, l'apparition fonctionne. C'est aussi ce qui garantit qu'aucun bloc
 * ne peut rester masqué.
 *
 * Trois portes de sortie, chacune laissant la page entièrement visible :
 *  - pas d'`IntersectionObserver` (navigateur ancien) ;
 *  - `prefers-reduced-motion` : on n'anime rien du tout ;
 *  - la moindre exception : la classe est retirée.
 *
 * `rootMargin` remonte le bord bas de 60 px pour que l'apparition se déclenche
 * un cheveu après l'entrée à l'écran. Une valeur en pixels, pas en pourcentage :
 * en pourcentage, un bloc situé tout en bas du document pourrait ne jamais
 * franchir le seuil, et resterait invisible.
 *
 * Les styles correspondants vivent dans `app/styles/reveal.css`.
 */
export const REVEAL_SCRIPT = `(function(){
var d=document,r=d.documentElement;
try{
if(!('IntersectionObserver' in window))return;
var m=window.matchMedia('(prefers-reduced-motion: reduce)');
if(m&&m.matches)return;
r.classList.add('js-reveal');
var start=function(){
try{
var io=new IntersectionObserver(function(es){
for(var i=0;i<es.length;i++){
if(es[i].isIntersecting){es[i].target.setAttribute('data-revealed','');io.unobserve(es[i].target);}
}
},{rootMargin:'0px 0px -60px 0px',threshold:0});
var n=d.querySelectorAll('[data-reveal],[data-reveal-group]');
for(var i=0;i<n.length;i++)io.observe(n[i]);
}catch(e){r.classList.remove('js-reveal');}
};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
}catch(e){r.classList.remove('js-reveal');}
})();`;
