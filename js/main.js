import { state, lsGet } from './state.js';
import { CURATED_SONGS } from './constants.js';
import { initVisuals, animate } from './visuals.js';
import { setupUI, updateLibraryUI } from './ui.js';
import { setupInput } from './input.js';
import { initAudio, loadInstrument } from './audio.js';
import { 
    startAutoplay, stopAutoplay, switchSong, selectSong, deleteSong,
    startNarrator, stopNarrator, setSustain, triggerFootBass,
    updateSongDisplay
} from './piano.js';

async function init() {
    console.log('Initializing Aether Studio Piano...');

    // 1. Setup Input & Visuals
    initVisuals();
    setupInput();

    // 2. Setup UI Handlers
    const handlers = {
        startAutoplay, stopAutoplay, switchSong, selectSong, deleteSong,
        startNarrator, stopNarrator, setSustain, triggerFootBass,
        initAudio, loadInstrument,
        updateSongDisplay,
        updateSheetMusic: (data, idx) => {
            // Internal bridge for UI triggering visuals
            import('./visuals.js').then(m => m.updateSheetMusic(data, idx));
        },
        setVolume: (v) => {
            if (state.audioStarted) {
                import('https://esm.sh/tone@15.1.22').then(Tone => {
                    Tone.getDestination().volume.rampTo(Tone.gainToDb(v), 0.1);
                });
            }
        },
        updateSongDisplay: () => {
             updateSongDisplay();
        }
    };

    setupUI(handlers);

    // 3. Populate Library with Songs from Assets
    const assetFiles = [
        "camille_saint_sa_ns___the_swan.js",
        "claude_debussy___arabesque_no__1.js",
        "claude_debussy___clair_de_lune.js",
        "edvard_grieg___piano_concerto_in_a_minor.js",
        "erik_satie___gnossienne_no__1.js",
        "erik_satie___gymnop_die_no__1.js",
        "felix_mendelssohn___rondo_capriccioso.js",
        "fr_d_ric_chopin___ballade_no__1_in_g_minor.js",
        "fr_d_ric_chopin___heroic_polonaise.js",
        "fr_d_ric_chopin___minute_waltz.js",
        "fr_d_ric_chopin___nocturne_op__9_no__2.js",
        "fr_d_ric_chopin___raindrop_prelude.js",
        "franz_liszt___hungarian_rhapsody_no__2.js",
        "franz_liszt___la_campanella.js",
        "franz_liszt___liebestr_ume_no__3.js",
        "franz_schubert___impromptu_op__90_no__3.js",
        "fur_elise_full.js",
        "johann_sebastian_bach___goldberg_variations.js",
        "johann_sebastian_bach___toccata_and_fugue_in_d_minor.js",
        "johann_sebastian_bach___well_tempered_clavier.js",
        "johannes_brahms___intermezzo_op__118_no__2.js",
        "ludwig_van_beethoven___appassionata_sonata.js",
        "ludwig_van_beethoven___f_r_elise.js",
        "ludwig_van_beethoven___moonlight_sonata.js",
        "ludwig_van_beethoven___path_tique_sonata.js",
        "maurice_ravel___pavane_for_a_dead_princess.js",
        "moonlight_sonata.js",
        "sergei_rachmaninoff___prelude_in_c_sharp_minor.js",
        "the_muffin_man.js",
        "wolfgang_amadeus_mozart___piano_sonata_no__16.js",
        "wolfgang_amadeus_mozart___rondo_alla_turca.js"
    ];

    for (const fileName of assetFiles) {
        // Create a readable name from the filename
        let name = fileName.replace('.js', '')
            .replace(/___/g, ' – ')
            .replace(/_/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        
        // Manual cleanup for special names
        if (fileName.includes('f_r_elise')) name = 'Ludwig van Beethoven – Für Elise';
        if (fileName === 'the_muffin_man.js') name = 'The Muffin Man';

        state.playlists[name] = { 
            name: name, 
            fileName: fileName,
            isLocal: true,
            data: null
        };
    }

    // Load extra saved songs from localStorage
    try {
        const saved = JSON.parse(localStorage.getItem('piano_saved_songs') || '{}');
        Object.assign(state.playlists, saved);
    } catch (_) {}

    updateLibraryUI();

    // 4. Load Last Song or Default
    const lastSong = lsGet('last_song', CURATED_SONGS[4] || CURATED_SONGS[0]); // Default to Fur Elise
    if (state.playlists[lastSong]) {
        state.currentSongKey = lastSong;
        // Since we don't have the data yet, we need to load it
        await loadSongData(lastSong);
        updateSongDisplay();
    }
    
    // Set initial volume if audio is later started
    if (state.masterVolume !== 0.8) {
        import('https://esm.sh/tone@15.1.22').then(Tone => {
            if (Tone.getDestination()) Tone.getDestination().volume.value = Tone.gainToDb(state.masterVolume);
        });
    }

    // 5. Start Animation Loop
    animate();
}

async function loadSongData(key) {
    const song = state.playlists[key];
    if (!song || song.data) return;

    try {
        const module = await import(`../assets/${song.fileName}`);
        song.data = Object.values(module)[0];
        console.log(`Loaded song data for: ${song.name}`);
    } catch (e) {
        console.error(`Failed to load song data for ${song.name}:`, e);
    }
}

// Override internal selectSong to handle data loading
const originalSelectSong = selectSong;
window.selectSong = async (key) => {
    await loadSongData(key);
    originalSelectSong(key);
};

// Start the app
init().catch(console.error);
