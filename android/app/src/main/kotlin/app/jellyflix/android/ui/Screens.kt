package app.jellyflix.android.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.jellyflix.android.JellyflixApp
import app.jellyflix.android.data.*
import coil.compose.AsyncImage
import kotlinx.coroutines.launch

/** Loads something once per key and shows it, with the failure message when it doesn't arrive. */
sealed interface Load<out T> { data object Busy : Load<Nothing>; data class Ok<T>(val value: T) : Load<T>; data class Failed(val message: String) : Load<Nothing> }

@Composable
fun <T> rememberLoad(key: Any?, block: suspend () -> T): Pair<Load<T>, () -> Unit> {
    var state by remember(key) { mutableStateOf<Load<T>>(Load.Busy) }
    var attempt by remember(key) { mutableIntStateOf(0) }
    LaunchedEffect(key, attempt) {
        state = Load.Busy
        state = try { Load.Ok(block()) } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { Load.Failed(e.message ?: "Something went wrong.") }
    }
    return state to { attempt++ }
}

@Composable
fun <T> Loaded(load: Pair<Load<T>, () -> Unit>, content: @Composable (T) -> Unit) {
    when (val s = load.first) {
        is Load.Busy -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator() }
        is Load.Failed -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            Text(s.message, color = Color(0xFFB3B3B3)); Spacer(Modifier.height(12.dp)); Button(onClick = load.second) { Text("Try again") }
        }
        is Load.Ok -> content(s.value)
    }
}

// ---------------------------------------------------------------- sign in

@Composable
fun LoginScreen(app: JellyflixApp, look: Look, onSignedIn: (Session) -> Unit) {
    var server by remember { mutableStateOf(app.store.lastServer) }
    var user by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text("JELLYFLIX", color = look.accent, style = MaterialTheme.typography.displaySmall)
        Spacer(Modifier.height(24.dp))
        Column(Modifier.widthIn(max = 420.dp)) {
            OutlinedTextField(server, { server = it }, Modifier.fillMaxWidth(), label = { Text("Server address") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri))
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(user, { user = it }, Modifier.fillMaxWidth(), label = { Text("Username") }, singleLine = true)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
            error?.let { Spacer(Modifier.height(8.dp)); Text(it, color = Color(0xFFFF6B6B)) }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    busy = true; error = null
                    scope.launch {
                        try { app.store.lastServer = server; onSignedIn(app.connector.login(server, user, password)) }
                        catch (e: Exception) { error = e.message ?: "Couldn't sign in." }
                        busy = false
                    }
                },
                enabled = !busy && server.isNotBlank() && user.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = look.accent, contentColor = Color.White),
            ) { Text(if (busy) "Signing in…" else "Sign in") }
        }
    }
}

// ---------------------------------------------------------------- tiles and rows

@Composable
fun Tile(api: JellyfinApi, look: Look, item: Item, wide: Boolean = look.landscape, onClick: () -> Unit) {
    val width = if (wide) 220.dp else 130.dp
    val url = if (wide) api.thumb(item) else api.poster(item)
    Column(Modifier.width(width)) {
        Box(Modifier.fillMaxWidth().aspectRatio(if (wide) 16f / 9f else 2f / 3f).background(look.surface).focusRing(look, onClick)) {
            AsyncImage(url, item.name, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            val pct = item.userData?.playedPercentage
            if (pct != null && pct in 1.0..99.0) {
                LinearProgressIndicator(progress = { (pct / 100).toFloat() }, modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(3.dp), color = look.accent)
            }
        }
        Text(if (item.type == "Episode") item.seriesName ?: item.name else item.name, Modifier.padding(top = 6.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun TileRow(api: JellyfinApi, look: Look, title: String, items: List<Item>, onOpen: (Item) -> Unit) {
    if (items.isEmpty()) return
    Column(Modifier.padding(vertical = 8.dp)) {
        Text(title, Modifier.padding(horizontal = 16.dp, vertical = 6.dp), style = MaterialTheme.typography.titleMedium)
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(items, key = { it.id }) { Tile(api, look, it) { onOpen(it) } }
        }
    }
}

// ---------------------------------------------------------------- home

private data class HomeData(val views: List<Item>, val resume: List<Item>, val nextUp: List<Item>, val rows: List<Pair<String, List<Item>>>)

@Composable
fun HomeScreen(api: JellyfinApi, look: Look, onOpen: (Item) -> Unit, onLibrary: (Item) -> Unit) {
    val load = rememberLoad(api.session) {
        val views = api.views()
        val resume = try { api.resume() } catch (e: Exception) { emptyList() }
        val next = try { api.nextUp() } catch (e: Exception) { emptyList() }
        val rows = views.mapNotNull { v ->
            val type = when (v.collectionType) { "movies" -> "Movie"; "tvshows" -> "Series"; else -> null } ?: return@mapNotNull null
            val latest = try { api.latest(type) } catch (e: Exception) { emptyList() }
            "Latest in ${v.name}" to latest
        }
        HomeData(views, resume, next, rows)
    }
    Loaded(load) { d ->
        LazyColumn(Modifier.fillMaxSize()) {
            item { Text("JELLYFLIX", Modifier.padding(16.dp), color = look.accent, style = MaterialTheme.typography.titleLarge) }
            item { TileRow(api, look, look.continueTitle, d.resume, onOpen) }
            item { TileRow(api, look, "Next Up", d.nextUp, onOpen) }
            item {
                Column(Modifier.padding(vertical = 8.dp)) {
                    Text("Libraries", Modifier.padding(horizontal = 16.dp, vertical = 6.dp), style = MaterialTheme.typography.titleMedium)
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(d.views, key = { it.id }) { Tile(api, look, it, wide = true) { onLibrary(it) } }
                    }
                }
            }
            items(d.rows) { (title, list) -> TileRow(api, look, title, list, onOpen) }
        }
    }
}

// ---------------------------------------------------------------- library and search grids

@Composable
fun GridOf(api: JellyfinApi, look: Look, items: List<Item>, onOpen: (Item) -> Unit) {
    if (items.isEmpty()) { Message("Nothing here."); return }
    LazyVerticalGrid(GridCells.Adaptive(if (look.landscape) 200.dp else 120.dp), contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        items(items, key = { it.id }) { Tile(api, look, it) { onOpen(it) } }
    }
}

@Composable
fun LibraryScreen(api: JellyfinApi, look: Look, library: Item, onOpen: (Item) -> Unit) {
    val types = when (library.collectionType) { "movies" -> listOf("Movie"); "tvshows" -> listOf("Series"); else -> listOf("Movie", "Series") }
    val load = rememberLoad(library.id) { api.items(Query(parentId = library.id, types = types, sortBy = "SortName", limit = 300)).items }
    Column(Modifier.fillMaxSize()) {
        Text(library.name, Modifier.padding(16.dp), style = MaterialTheme.typography.titleLarge)
        Loaded(load) { GridOf(api, look, it, onOpen) }
    }
}

@Composable
fun SearchScreen(api: JellyfinApi, look: Look, onOpen: (Item) -> Unit) {
    var term by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Item>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(term) {
        if (term.isBlank()) { results = emptyList(); error = null; return@LaunchedEffect }
        kotlinx.coroutines.delay(300)
        try { results = api.search(term.trim()); error = null } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) { error = e.message }
    }
    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(term, { term = it }, Modifier.fillMaxWidth().padding(16.dp), label = { Text("Search movies and shows") }, singleLine = true)
        error?.let { Message(it) }
        if (term.isNotBlank() && error == null) GridOf(api, look, results, onOpen)
    }
}

// ---------------------------------------------------------------- details

@Composable
fun DetailsScreen(api: JellyfinApi, look: Look, id: String, onPlay: (Item) -> Unit, onOpen: (Item) -> Unit) {
    var version by remember { mutableIntStateOf(0) }
    val load = rememberLoad(id to version) { api.item(id) }
    val scope = rememberCoroutineScope()
    Loaded(load) { t ->
        val series = t.type == "Series"
        val episodes = rememberLoad(t.id) { if (series) api.episodes(t.id) else emptyList() }
        val similar = rememberLoad(t.id) { try { api.similar(t.id) } catch (e: Exception) { emptyList() } }
        var favorite by remember(t.id, version) { mutableStateOf(t.userData?.isFavorite == true) }
        var season by remember(t.id) { mutableStateOf<Int?>(null) }
        LazyColumn(Modifier.fillMaxSize()) {
            item {
                Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(look.surface)) {
                    AsyncImage(api.backdrop(t) ?: api.thumb(t, 1280), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    Box(Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Brush.verticalGradient(listOf(Color.Transparent, look.background))))
                }
            }
            item {
                Column(Modifier.padding(16.dp)) {
                    Text(t.name, style = MaterialTheme.typography.headlineMedium)
                    Text(listOfNotNull(t.productionYear?.toString(), t.officialRating, minutes(t.runTimeTicks), t.genres?.take(3)?.joinToString(", ")).joinToString("  •  "), color = Color(0xFFB3B3B3), style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (!series) {
                            val resumed = (t.userData?.playbackPositionTicks ?: 0) > 0
                            Button(onClick = { onPlay(t) }, colors = ButtonDefaults.buttonColors(containerColor = look.accent, contentColor = Color.White)) {
                                Icon(Icons.Default.PlayArrow, null); Text(if (resumed) "Resume" else "Play")
                            }
                            Spacer(Modifier.width(10.dp))
                        }
                        OutlinedButton(onClick = { favorite = !favorite; scope.launch { try { api.setFavorite(t.id, favorite) } catch (e: Exception) { favorite = !favorite } } }) {
                            Icon(if (favorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder, null); Spacer(Modifier.width(6.dp)); Text("My List")
                        }
                    }
                    t.overview?.let { Spacer(Modifier.height(12.dp)); Text(it, style = MaterialTheme.typography.bodyMedium) }
                    t.people?.filter { it.type == "Actor" }?.take(8)?.takeIf { it.isNotEmpty() }?.let {
                        Spacer(Modifier.height(10.dp)); Text("Cast: " + it.joinToString(", ") { p -> p.name }, color = Color(0xFFB3B3B3), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            if (series) {
                val all = (episodes.first as? Load.Ok)?.value.orEmpty()
                val seasons = all.mapNotNull { it.parentIndexNumber }.distinct().sorted()
                val shown = season ?: seasons.firstOrNull()
                if (seasons.size > 1) item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(seasons) { n -> FilterChip(selected = n == shown, onClick = { season = n }, label = { Text("Season $n") }) }
                    }
                }
                items(all.filter { it.parentIndexNumber == shown }, key = { it.id }) { ep ->
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp).focusRing(look) { onPlay(ep) }, verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(api.thumb(ep, 400), null, Modifier.width(140.dp).aspectRatio(16f / 9f).clip(androidx.compose.foundation.shape.RoundedCornerShape(look.corner.dp)).background(look.surface), contentScale = ContentScale.Crop)
                        Column(Modifier.padding(start = 12.dp)) {
                            Text("${ep.indexNumber ?: ""}. ${ep.name}", maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(ep.overview.orEmpty(), maxLines = 2, overflow = TextOverflow.Ellipsis, color = Color(0xFFB3B3B3), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            item { TileRow(api, look, "More like this", (similar.first as? Load.Ok)?.value.orEmpty(), onOpen) }
        }
    }
}

// ---------------------------------------------------------------- settings

@Composable
fun SettingsScreen(look: Look, session: Session, onLook: (Look) -> Unit, onSignOut: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Settings", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(16.dp))
        Text("Look", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(Looks) { l -> FilterChip(selected = l.id == look.id, onClick = { onLook(l) }, label = { Text(l.label) }) }
        }
        Spacer(Modifier.height(24.dp))
        Text("Signed in as ${session.userName} on ${session.server}", color = Color(0xFFB3B3B3), style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onSignOut) { Text("Sign out") }
    }
}
