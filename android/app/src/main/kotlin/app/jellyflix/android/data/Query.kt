package app.jellyflix.android.data

import java.net.URLEncoder

private fun enc(value: String) = URLEncoder.encode(value, "UTF-8").replace("+", "%20")

const val FIELDS = "Overview,Genres,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks"

/**
 * The query string for /Items. A server can be set to "group movies into collections", which swaps each movie for its
 * collection in plain lists; asking for CollapseBoxSetItems=false keeps lists to the movies themselves.
 */
fun itemsQuery(userId: String, q: Query): String {
    val parts = linkedMapOf(
        "userId" to userId, "Fields" to FIELDS, "EnableTotalRecordCount" to "true", "CollapseBoxSetItems" to "false", "Recursive" to "true",
    )
    q.parentId?.let { parts["ParentId"] = it }
    if (q.types.isNotEmpty()) parts["IncludeItemTypes"] = q.types.joinToString(",")
    if (q.genres.isNotEmpty()) parts["Genres"] = q.genres.joinToString("|")
    if (q.filters.isNotEmpty()) parts["Filters"] = q.filters.joinToString(",")
    q.sortBy?.let { parts["SortBy"] = it; parts["SortOrder"] = q.sortOrder }
    if (q.start > 0) parts["StartIndex"] = q.start.toString()
    q.limit?.let { parts["Limit"] = it.toString() }
    q.search?.let { parts["SearchTerm"] = it }
    q.personId?.let { parts["PersonIds"] = it }
    return parts.entries.joinToString("&") { "${enc(it.key)}=${enc(it.value)}" }
}
