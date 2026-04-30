# Échelle et Physique

Actuellement, la taille de l'écran est de 942mm pour 530mm.
La taille des plans est augmentée avec un rapport de 100, afin de travailler sur des modèles plus grands.


Pour calculer la valeur des forces à appliquer sans avoir besoin de manuellement incliner chaque mesh, voici comment faire : 

Nous savons qu'un flipper a un inclinaisons comprise entre 6 et 7 degrés, la majorité étant à 6.5

Nous partirons de cette valeur pour ensuite calculer ainsi : 

## Angle du flipper

$$
\theta = 6.5^\circ \approx 0.1134 \text{ rad}
$$

On part d’une gravité classique :

$$
g = 9.81 \, m/s^2
$$

## 🎯 Principe

Si ta table est inclinée sur l’axe X (cas le plus classique en pinball), alors la gravité se décompose comme ça :

$$
g_y = -g \cos(\theta)
$$

$$
g_z = -g \sin(\theta)
$$

👉 Y = vertical  
👉 Z = direction vers le bas de la pente

## 🔢 Valeurs numériques (pour 6.5°)

$$
y \approx -9.75
$$

$$
z \approx -1.11
$$

D'où la valeur dans [Config.js](/frontend/physics/Config.js) de :

```javascript
const world = new RAPIER.World({ x: 0, y: -9.75, z: -1.11 });
```