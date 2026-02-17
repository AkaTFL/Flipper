gantt
    title Projet Flipper — Roadmap (23 fév → 12 juin)
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b
    excludes    weekends

    section Modestin (Backend Go + WebSocket)
    S1 - Setup Go + WebSocket minimal                          :m01, 2026-02-23, 5d
    S2 - MQTT client + Relay MQTT→WS                           :m02, 2026-03-02, 5d
    S3 - Struct Game/Player + Event dispatcher                 :m03, 2026-03-09, 5d
    S4 - Gestion score backend                                 :m04, 2026-03-16, 5d
    S5 - États IDLE/PLAYING/GAME_OVER                           :m05, 2026-03-23, 5d
    S6 - Sécurisation concurrence backend                       :m06, 2026-03-30, 5d
    S7 - Broadcast structuré WebSocket                          :m07, 2026-04-06, 5d
    S8 - Validation ordre des événements                         :m08, 2026-04-13, 5d
    S9 - Traitement événements physiques (IoT)                  :m09, 2026-04-20, 5d
    S10 - Sécurité anti-doublons événements                      :m10, 2026-04-27, 5d
    S11 - Optimisation backend                                  :m11, 2026-05-04, 5d
    S12 - API backend pour module IA                            :m12, 2026-05-11, 5d
    S13 - Intégration logique IA côté backend                    :m13, 2026-05-18, 5d
    S14 - Optimisation concurrence                               :m14, 2026-05-25, 5d
    S15 - Documentation backend                                  :m15, 2026-06-01, 5d
    S16 - Validation backend final                               :m16, 2026-06-08, 5d

    section Charles (ESP32 + MQTT)
    S1 - Installation Mosquitto + test pub MQTT                 :c01, 2026-02-23, 5d
    S2 - Connexion ESP32 au broker                               :c02, 2026-03-02, 5d
    S3 - Standardisation topics MQTT                             :c03, 2026-03-09, 5d
    S4 - Validation stabilité MQTT                               :c04, 2026-03-16, 5d
    S5 - Tests QoS MQTT                                          :c05, 2026-03-23, 5d
    S6 - Optimisation publication MQTT                           :c06, 2026-03-30, 5d
    S7 - Monitoring broker MQTT                                  :c07, 2026-04-06, 5d
    S8 - Tests stabilité MQTT                                    :c08, 2026-04-13, 5d
    S9 - Mapping GPIO (X, C, D, F)                               :c09, 2026-04-20, 5d
    S10 - Pilotage solénoïdes ESP32                               :c10, 2026-04-27, 5d
    S11 - Tests matériel réels                                    :c11, 2026-05-04, 5d
    S12 - Transmission données capteurs au backend               :c12, 2026-05-11, 5d
    S13 - Vérification stabilité MQTT                             :c13, 2026-05-18, 5d
    S14 - Stabilisation MQTT                                      :c14, 2026-05-25, 5d
    S15 - Documentation IoT                                       :c15, 2026-06-01, 5d
    S16 - Validation IoT final                                    :c16, 2026-06-08, 5d

    section Hugo (Frontend 3D)
    S1 - Setup Three.js + scène vide + caméra                    :h01, 2026-02-23, 5d
    S2 - Réception WebSocket frontend                             :h02, 2026-03-02, 5d
    S3 - Intégration Rapier + bille dynamique                      :h03, 2026-03-09, 5d
    S4 - Flippers clavier + détection collisions                   :h04, 2026-03-16, 5d
    S5 - Affichage score Playfield                                :h05, 2026-03-23, 5d
    S6 - Ajustement collisions                                     :h06, 2026-03-30, 5d
    S7 - Synchronisation Playfield / Backglass                     :h07, 2026-04-06, 5d
    S8 - Intégration DMD                                           :h08, 2026-04-13, 5d
    S9 - Réaction visuelle aux événements physiques                :h09, 2026-04-20, 5d
    S10 - Animation visuelle synchronisée                          :h10, 2026-04-27, 5d
    S11 - Optimisation performance rendu                           :h11, 2026-05-04, 5d
    S12 - Affichage résultats IA sur DMD                           :h12, 2026-05-11, 5d
    S13 - Ajustement interface IA                                  :h13, 2026-05-18, 5d
    S14 - Optimisation FPS                                         :h14, 2026-05-25, 5d
    S15 - Documentation frontend                                   :h15, 2026-06-01, 5d
    S16 - Validation frontend final                                :h16, 2026-06-08, 5d

    section Baptiste (Art 3D)
    S1 - Début modélisation table                                  :b01, 2026-02-23, 5d
    S2 - Modélisation flippers                                     :b02, 2026-03-02, 5d
    S3 - Obstacles 3D                                              :b03, 2026-03-09, 5d
    S4 - Ajustement modèles 3D                                     :b04, 2026-03-16, 5d
    S5 - Début design DMD                                          :b05, 2026-03-23, 5d
    S6 - Optimisation assets 3D                                    :b06, 2026-03-30, 5d
    S7 - Animations Backglass                                      :b07, 2026-04-06, 5d
    S8 - Finalisation UI rétro                                     :b08, 2026-04-13, 5d
    S9 - Ajustement visuel éléments physiques                       :b09, 2026-04-20, 5d
    S10 - Ajustement visuel animations                              :b10, 2026-04-27, 5d
    S11 - Optimisation modèles                                       :b11, 2026-05-04, 5d
    S12 - UI visuelle pour feedback IA                               :b12, 2026-05-11, 5d
    S13 - Ajustement visuel IA                                       :b13, 2026-05-18, 5d
    S14 - Finalisation assets                                        :b14, 2026-05-25, 5d
    S15 - Documentation assets                                       :b15, 2026-06-01, 5d
    S16 - Validation assets final                                    :b16, 2026-06-08, 5d

    section Raphael (Tests & CI/CD)
    S1 - Setup Gitflow + pipeline CI (build Go)                     :r01, 2026-02-23, 5d
    S2 - Tests unitaires backend + vérif build auto                 :r02, 2026-03-02, 5d
    S3 - Race detector + tests concurrence backend                  :r03, 2026-03-09, 5d
    S4 - Tests unitaires score                                      :r04, 2026-03-16, 5d
    S5 - Tests transitions d’état                                   :r05, 2026-03-23, 5d
    S6 - CI étendue + lint JS/Go                                    :r06, 2026-03-30, 5d
    S7 - Tests multi-clients WebSocket                              :r07, 2026-04-06, 5d
    S8 - Tests robustesse WebSocket                                 :r08, 2026-04-13, 5d
    S9 - Tests end-to-end simulés                                   :r09, 2026-04-20, 5d
    S10 - Tests latence IoT → Frontend                              :r10, 2026-04-27, 5d
    S11 - Tests robustesse + monitoring CI                          :r11, 2026-05-04, 5d
    S12 - Tests performance backend                                 :r12, 2026-05-11, 5d
    S13 - Tests charge backend                                      :r13, 2026-05-18, 5d
    S14 - Augmentation couverture tests                             :r14, 2026-05-25, 5d
    S15 - Vérification pipeline complet                             :r15, 2026-06-01, 5d
    S16 - Tag v1.0.0 + gel du code + CI stable                      :r16, 2026-06-08, 5d
