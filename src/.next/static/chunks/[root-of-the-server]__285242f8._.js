(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s({
    "connect": ()=>connect,
    "setHooks": ()=>setHooks,
    "subscribeToUpdate": ()=>subscribeToUpdate
});
function connect(param) {
    let { addMessageListener, sendMessage, onUpdateError = console.error } = param;
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: (param)=>{
            let [chunkPath, callback] = param;
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        var _updateA_modules;
        const deletedModules = new Set((_updateA_modules = updateA.modules) !== null && _updateA_modules !== void 0 ? _updateA_modules : []);
        var _updateB_modules;
        const addedModules = new Set((_updateB_modules = updateB.modules) !== null && _updateB_modules !== void 0 ? _updateB_modules : []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        var _updateA_added, _updateB_added;
        const added = new Set([
            ...(_updateA_added = updateA.added) !== null && _updateA_added !== void 0 ? _updateA_added : [],
            ...(_updateB_added = updateB.added) !== null && _updateB_added !== void 0 ? _updateB_added : []
        ]);
        var _updateA_deleted, _updateB_deleted;
        const deleted = new Set([
            ...(_updateA_deleted = updateA.deleted) !== null && _updateA_deleted !== void 0 ? _updateA_deleted : [],
            ...(_updateB_deleted = updateB.deleted) !== null && _updateB_deleted !== void 0 ? _updateB_deleted : []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        var _updateA_modules1, _updateB_added1;
        const modules = new Set([
            ...(_updateA_modules1 = updateA.modules) !== null && _updateA_modules1 !== void 0 ? _updateA_modules1 : [],
            ...(_updateB_added1 = updateB.added) !== null && _updateB_added1 !== void 0 ? _updateB_added1 : []
        ]);
        var _updateB_deleted1;
        for (const moduleId of (_updateB_deleted1 = updateB.deleted) !== null && _updateB_deleted1 !== void 0 ? _updateB_deleted1 : []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        var _updateB_modules1;
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set((_updateB_modules1 = updateB.modules) !== null && _updateB_modules1 !== void 0 ? _updateB_modules1 : []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error("Invariant: ".concat(message));
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/data/quizzes.json (json)": ((__turbopack_context__) => {

__turbopack_context__.v(JSON.parse("[{\"id\":1,\"title\":\"General Knowledge Trivia\",\"category\":\"General\",\"questions\":[{\"question\":\"What is the capital of France?\",\"options\":[\"Paris\",\"London\",\"Berlin\",\"Madrid\"],\"correctAnswer\":\"Paris\"},{\"question\":\"Which river is the longest in the world?\",\"options\":[\"Amazon\",\"Nile\",\"Yangtze\",\"Mississippi\"],\"correctAnswer\":\"Nile\"},{\"question\":\"Who painted the Mona Lisa?\",\"options\":[\"Vincent van Gogh\",\"Leonardo da Vinci\",\"Pablo Picasso\",\"Claude Monet\"],\"correctAnswer\":\"Leonardo da Vinci\"},{\"question\":\"What is the largest planet in our solar system?\",\"options\":[\"Mars\",\"Jupiter\",\"Saturn\",\"Earth\"],\"correctAnswer\":\"Jupiter\"},{\"question\":\"Which country hosted the 2016 Summer Olympics?\",\"options\":[\"China\",\"Brazil\",\"Japan\",\"United Kingdom\"],\"correctAnswer\":\"Brazil\"},{\"question\":\"What is the chemical symbol for gold?\",\"options\":[\"Au\",\"Ag\",\"Fe\",\"Cu\"],\"correctAnswer\":\"Au\"},{\"question\":\"Who wrote the novel 'Pride and Prejudice'?\",\"options\":[\"Jane Austen\",\"Charlotte Brontë\",\"Emily Dickinson\",\"Virginia Woolf\"],\"correctAnswer\":\"Jane Austen\"},{\"question\":\"What is the smallest country in the world?\",\"options\":[\"Monaco\",\"Vatican City\",\"San Marino\",\"Liechtenstein\"],\"correctAnswer\":\"Vatican City\"},{\"question\":\"Which element has the atomic number 1?\",\"options\":[\"Helium\",\"Hydrogen\",\"Lithium\",\"Beryllium\"],\"correctAnswer\":\"Hydrogen\"},{\"question\":\"In which year did World War II end?\",\"options\":[\"1943\",\"1944\",\"1945\",\"1946\"],\"correctAnswer\":\"1945\"}]},{\"id\":2,\"title\":\"Science and Technology\",\"category\":\"Science\",\"questions\":[{\"question\":\"What is H2O commonly known as?\",\"options\":[\"Oxygen\",\"Water\",\"Hydrogen\",\"Carbon\"],\"correctAnswer\":\"Water\"},{\"question\":\"What gas do plants absorb during photosynthesis?\",\"options\":[\"Oxygen\",\"Nitrogen\",\"Carbon Dioxide\",\"Helium\"],\"correctAnswer\":\"Carbon Dioxide\"},{\"question\":\"What is the primary source of energy for Earth?\",\"options\":[\"Moon\",\"Sun\",\"Wind\",\"Geothermal\"],\"correctAnswer\":\"Sun\"},{\"question\":\"Which scientist developed the theory of relativity?\",\"options\":[\"Isaac Newton\",\"Albert Einstein\",\"Galileo Galilei\",\"Stephen Hawking\"],\"correctAnswer\":\"Albert Einstein\"},{\"question\":\"What is the unit of electric current?\",\"options\":[\"Volt\",\"Watt\",\"Ampere\",\"Ohm\"],\"correctAnswer\":\"Ampere\"},{\"question\":\"Which planet is known as the Red Planet?\",\"options\":[\"Venus\",\"Mars\",\"Jupiter\",\"Saturn\"],\"correctAnswer\":\"Mars\"},{\"question\":\"What is the main component of the Earth's atmosphere?\",\"options\":[\"Oxygen\",\"Nitrogen\",\"Carbon Dioxide\",\"Argon\"],\"correctAnswer\":\"Nitrogen\"},{\"question\":\"Who invented the telephone?\",\"options\":[\"Thomas Edison\",\"Alexander Graham Bell\",\"Nikola Tesla\",\"Guglielmo Marconi\"],\"correctAnswer\":\"Alexander Graham Bell\"},{\"question\":\"What is the speed of light in a vacuum?\",\"options\":[\"300,000 km/s\",\"150,000 km/s\",\"450,000 km/s\",\"600,000 km/s\"],\"correctAnswer\":\"300,000 km/s\"},{\"question\":\"Which particle carries a negative charge?\",\"options\":[\"Proton\",\"Neutron\",\"Electron\",\"Photon\"],\"correctAnswer\":\"Electron\"}]},{\"id\":3,\"title\":\"World History\",\"category\":\"History\",\"questions\":[{\"question\":\"Who was the first Emperor of the Roman Empire?\",\"options\":[\"Julius Caesar\",\"Augustus\",\"Nero\",\"Constantine\"],\"correctAnswer\":\"Augustus\"},{\"question\":\"In which year did the Titanic sink?\",\"options\":[\"1909\",\"1912\",\"1915\",\"1918\"],\"correctAnswer\":\"1912\"},{\"question\":\"Which ancient wonder was located in Alexandria?\",\"options\":[\"Colossus of Rhodes\",\"Lighthouse of Alexandria\",\"Hanging Gardens\",\"Statue of Zeus\"],\"correctAnswer\":\"Lighthouse of Alexandria\"},{\"question\":\"Who led the Indian independence movement against British rule?\",\"options\":[\"Jawaharlal Nehru\",\"Mahatma Gandhi\",\"Subhas Chandra Bose\",\"Bhagat Singh\"],\"correctAnswer\":\"Mahatma Gandhi\"},{\"question\":\"What was the name of the ship that carried the Pilgrims to America in 1620?\",\"options\":[\"Mayflower\",\"Santa Maria\",\"Nina\",\"Pinta\"],\"correctAnswer\":\"Mayflower\"},{\"question\":\"Which war was fought between 1939 and 1945?\",\"options\":[\"World War I\",\"World War II\",\"Cold War\",\"Korean War\"],\"correctAnswer\":\"World War II\"},{\"question\":\"Who was the first female Prime Minister of the United Kingdom?\",\"options\":[\"Margaret Thatcher\",\"Theresa May\",\"Indira Gandhi\",\"Angela Merkel\"],\"correctAnswer\":\"Margaret Thatcher\"},{\"question\":\"In which city was the Declaration of Independence signed in 1776?\",\"options\":[\"Boston\",\"New York\",\"Philadelphia\",\"Washington D.C.\"],\"correctAnswer\":\"Philadelphia\"},{\"question\":\"Which civilization built the Machu Picchu?\",\"options\":[\"Maya\",\"Aztec\",\"Inca\",\"Olmec\"],\"correctAnswer\":\"Inca\"},{\"question\":\"What was the primary language of the Byzantine Empire?\",\"options\":[\"Latin\",\"Greek\",\"Aramaic\",\"Coptic\"],\"correctAnswer\":\"Greek\"}]},{\"id\":4,\"title\":\"Geography Challenge\",\"category\":\"Geography\",\"questions\":[{\"question\":\"What is the largest continent by land area?\",\"options\":[\"Africa\",\"Asia\",\"Australia\",\"Europe\"],\"correctAnswer\":\"Asia\"},{\"question\":\"Which country has the most deserts in the world?\",\"options\":[\"Australia\",\"Sahara\",\"Antarctica\",\"Chile\"],\"correctAnswer\":\"Antarctica\"},{\"question\":\"What is the highest mountain in the world?\",\"options\":[\"K2\",\"Kangchenjunga\",\"Mount Everest\",\"Lhotse\"],\"correctAnswer\":\"Mount Everest\"},{\"question\":\"Which country has the longest coastline?\",\"options\":[\"United States\",\"Canada\",\"Australia\",\"Russia\"],\"correctAnswer\":\"Canada\"},{\"question\":\"What is the capital of Australia?\",\"options\":[\"Sydney\",\"Melbourne\",\"Canberra\",\"Perth\"],\"correctAnswer\":\"Canberra\"},{\"question\":\"Which African country is known as the 'Pearl of Africa'?\",\"options\":[\"Kenya\",\"Uganda\",\"Nigeria\",\"Ghana\"],\"correctAnswer\":\"Uganda\"},{\"question\":\"What is the largest desert in the world?\",\"options\":[\"Sahara\",\"Gobi\",\"Kalahari\",\"Antarctic Desert\"],\"correctAnswer\":\"Antarctic Desert\"},{\"question\":\"Which river flows through Egypt?\",\"options\":[\"Nile\",\"Amazon\",\"Mississippi\",\"Yangtze\"],\"correctAnswer\":\"Nile\"},{\"question\":\"What is the smallest continent by land area?\",\"options\":[\"Europe\",\"Australia\",\"Antarctica\",\"South America\"],\"correctAnswer\":\"Australia\"},{\"question\":\"Which country is known as the Land of the Rising Sun?\",\"options\":[\"China\",\"Japan\",\"South Korea\",\"Thailand\"],\"correctAnswer\":\"Japan\"}]}]"));}),
"[project]/pages/quiz/[id].js [client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>Quiz
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$data$2f$quizzes$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/data/quizzes.json (json)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
function Quiz() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { id } = router.query;
    const [quiz, setQuiz] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [selectedAnswer, setSelectedAnswer] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [answers, setAnswers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [score, setScore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [quizCompleted, setQuizCompleted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Quiz.useEffect": ()=>{
            if (id) {
                const selectedQuiz = __TURBOPACK__imported__module__$5b$project$5d2f$data$2f$quizzes$2e$json__$28$json$29$__["default"].find({
                    "Quiz.useEffect.selectedQuiz": (q)=>q.id === parseInt(id)
                }["Quiz.useEffect.selectedQuiz"]);
                if (selectedQuiz) {
                    setQuiz(selectedQuiz);
                    setAnswers(new Array(selectedQuiz.questions.length).fill(''));
                } else {
                    setQuiz(null);
                }
            }
        }
    }["Quiz.useEffect"], [
        id
    ]);
    const handleAnswerSelect = (answer)=>{
        setSelectedAnswer(answer);
    };
    const handleNext = ()=>{
        if (!selectedAnswer) {
            alert('Please select an answer!');
            return;
        }
        const newAnswers = [
            ...answers
        ];
        newAnswers[currentQuestionIndex] = selectedAnswer;
        setAnswers(newAnswers);
        if (selectedAnswer === quiz.questions[currentQuestionIndex].correctAnswer) {
            setScore((prevScore)=>prevScore + 1);
        }
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer('');
        } else {
            const newScore = {
                quizId: parseInt(id),
                score: score + (selectedAnswer === quiz.questions[currentQuestionIndex].correctAnswer ? 1 : 0),
                total: quiz.questions.length,
                date: new Date().toISOString()
            };
            const storedScores = JSON.parse(localStorage.getItem('quizScores')) || [];
            localStorage.setItem('quizScores', JSON.stringify([
                ...storedScores,
                newScore
            ]));
            setQuizCompleted(true);
        }
    };
    const handleRestart = ()=>{
        setCurrentQuestionIndex(0);
        setSelectedAnswer('');
        setAnswers(new Array(quiz.questions.length).fill(''));
        setScore(0);
        setQuizCompleted(false);
    };
    const goToResults = ()=>{
        router.push("/quiz/".concat(id, "/results"));
    };
    if (!id || !quiz) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-gray-100 flex flex-col items-center py-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-4xl font-bold mb-8",
                    children: "Quiz Not Found"
                }, void 0, false, {
                    fileName: "[project]/pages/quiz/[id].js",
                    lineNumber: 77,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                    href: "/",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                        className: "text-blue-600 hover:underline",
                        children: "Back to Home"
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz/[id].js",
                        lineNumber: 79,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/pages/quiz/[id].js",
                    lineNumber: 78,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/pages/quiz/[id].js",
            lineNumber: 76,
            columnNumber: 7
        }, this);
    }
    const progress = (currentQuestionIndex + 1) / quiz.questions.length * 100;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gray-100 flex flex-col items-center py-8",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-4xl font-bold mb-4",
                children: quiz.title
            }, void 0, false, {
                fileName: "[project]/pages/quiz/[id].js",
                lineNumber: 89,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-2xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-600 mb-2",
                                children: [
                                    "Question ",
                                    currentQuestionIndex + 1,
                                    " of ",
                                    quiz.questions.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 92,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full bg-gray-200 rounded-full h-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-blue-600 h-4 rounded-full",
                                    style: {
                                        width: "".concat(progress, "%")
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/pages/quiz/[id].js",
                                    lineNumber: 96,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 95,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz/[id].js",
                        lineNumber: 91,
                        columnNumber: 9
                    }, this),
                    quizCompleted ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-6 bg-white rounded-lg shadow text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl font-semibold mb-4",
                                children: "Quiz Completed!"
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 105,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg mb-4",
                                children: [
                                    "Your score: ",
                                    score,
                                    "/",
                                    quiz.questions.length,
                                    " (",
                                    (score / quiz.questions.length * 100).toFixed(2),
                                    "%)"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 106,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-center space-x-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleRestart,
                                        className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700",
                                        children: "Restart Quiz"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz/[id].js",
                                        lineNumber: 111,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: goToResults,
                                        className: "px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700",
                                        children: "View Results"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz/[id].js",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 110,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    className: "block mt-4 text-blue-600 hover:underline",
                                    children: "Back to Home"
                                }, void 0, false, {
                                    fileName: "[project]/pages/quiz/[id].js",
                                    lineNumber: 125,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 124,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz/[id].js",
                        lineNumber: 104,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-6 bg-white rounded-lg shadow",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xl font-medium mb-4",
                                children: quiz.questions[currentQuestionIndex].question
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 130,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2",
                                children: quiz.questions[currentQuestionIndex].options.map((option, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "radio",
                                                name: "answer",
                                                value: option,
                                                checked: selectedAnswer === option,
                                                onChange: ()=>handleAnswerSelect(option),
                                                className: "mr-2"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/quiz/[id].js",
                                                lineNumber: 136,
                                                columnNumber: 19
                                            }, this),
                                            option
                                        ]
                                    }, index, true, {
                                        fileName: "[project]/pages/quiz/[id].js",
                                        lineNumber: 135,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 133,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleNext,
                                className: "mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700",
                                children: currentQuestionIndex < quiz.questions.length - 1 ? 'Next' : 'Finish'
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz/[id].js",
                                lineNumber: 148,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz/[id].js",
                        lineNumber: 129,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz/[id].js",
                lineNumber: 90,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/quiz/[id].js",
        lineNumber: 88,
        columnNumber: 5
    }, this);
}
_s(Quiz, "aKCn2tmY9Ih5OjfO8mB/Y8SA9bg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = Quiz;
var _c;
__turbopack_context__.k.register(_c, "Quiz");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/quiz/[id].js [client] (ecmascript)\" } [client] (ecmascript)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const PAGE_PATH = "/quiz/[id]";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/quiz/[id].js [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/quiz/[id].js\" }": ((__turbopack_context__) => {
"use strict";

var { m: module } = __turbopack_context__;
{
__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/quiz/[id].js [client] (ecmascript)\" } [client] (ecmascript)");
}}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__285242f8._.js.map