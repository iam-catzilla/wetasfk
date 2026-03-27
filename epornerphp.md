Eporner API - PHP Example code

Welcome to the Eporner API PHP examples!

Here you can find simple examples of how to use our API with PHP. Codes bellow assume that you are running PHP 5+ version and have cURL extension enabled.

For your convenience each code contain comments and description to let you know what we are doing.
Example #1: Fetch latest 50 videos videos tagged as anal

<?php
function EpornerAPICall($api_url, $params) {
$url = $api_url . '?' . http_build_query($params);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$results = curl_exec($ch);
curl_close($ch);
return $results;
}
function getEpornerVideos($page = 0, $query = 'all') {
$api_url = 'https://www.eporner.com/api/v2/video/search/';
$params = array(
'query' => $query,
'page' => $page
);
$response = EpornerAPICall($api_url, $params);
if($response) {
$json = json_decode($response);
return $json;
}
return false;
}
$page = 1; //start from first page
$total_pages = 1; //will be set to real value after success API call
$max_videos_to_fetch = 50; //limit max videos to fetch in loop
$fetched_videos = 0; //internal counter
do {
$apiResponse = getEpornerVideos($page, 'anal');
//you can change 'anal' to any other phrase you would like to search
if($apiResponse) {
$videos = $apiResponse->videos;
$page = $apiResponse->page + 1;
$total_pages = $apiResponse->total_pages;
foreach($videos as $video) {
if($fetched_videos >= $max_videos_to_fetch) break;
$fetched_videos++;
echo 'Video #' . $fetched_videos . PHP_EOL;
echo $video->id . PHP_EOL;
echo $video->title . PHP_EOL;
echo $video->url . PHP_EOL;
//you can access here all video fields described in Results of ID Method
}
} else {
//we have an error : (
}
} while ( $page < $total_pages && $fetched_videos < $max_videos_to_fetch );
?>

EpornerAPICall function takes as an arguments string api_url and array params. It builds query, executes cURL request to our API and return response.

getEpornerVideos function here takes as an arguments integer page and string query. Query parameter can be used to specify word/phrase that you would like to search or all to display all videos. Function then execute call to API, check if response is valid, parse JSON object and return it.

Remaining code starts do{}while loop where it fetch subsequent result pages and display each video details. After reaching max_videos_to_fetch loop break.
Example #2: Fetch all videos with big thumbnails ordered by most popular

Lets fetch all videos. First example is quite simple, but for effective downloading large number of videos we need a bit fine-tuning.

In first example we leave almost all parameters to default values so it will use medium thumbnails, order videos by newest first and fetch only 30 videos per page/api call.

For downloading large number of videos we recommend to increase per_page number to 1000 to reduce number of API calls and speed up whole script.

<?php
function EpornerAPICall($api_url, $params) {
$url = $api_url . '?' . http_build_query($params);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$results = curl_exec($ch);
curl_close($ch);
return $results;
}
function getEpornerVideos($page = 0, $query = 'all', $per_page = 30, $order = 'latest', $thumbsize = 'medium') {
$api_url = 'https://www.eporner.com/api/v2/video/search/';
$params = array(
'per_page' => $per_page,
'order' => $order,
'thumbsize' => $thumbsize,
'query' => $query,
'page' => $page
);
$response = EpornerAPICall($api_url, $params);
if($response) {
$json = json_decode($response);
return $json;
}
return false;
}
$page = 1; //start from first page
$total_pages = 1; //will be set to real value after success API call
$max_videos_to_fetch = 10000; //limit max videos to fetch in loop
$fetched_videos = 0; //internal counter
do {
$apiResponse = getEpornerVideos($page, 'all', 1000, 'most-popular', 'big');
//1000 videos per api request, order by 'most-popular', big thumbs
//you can change 'all' to any other phrase you would like to search
if($apiResponse) {
$videos = $apiResponse->videos;
$page = $apiResponse->page + 1;
$total_pages = $apiResponse->total_pages;
foreach($videos as $video) {
if($fetched_videos >= $max_videos_to_fetch) break;
$fetched_videos++;
echo 'Video #' . $fetched_videos . PHP_EOL;
echo $video->id . PHP_EOL;
echo $video->title . PHP_EOL;
echo $video->url . PHP_EOL;
//you can access here all video fields described in Results of ID Method
}
} else {
//we have an error : (
}
} while ( $page < $total_pages && $fetched_videos < $max_videos_to_fetch );
?>

Example #3: Fetch information about single video by id

In this example we will fetch all information about specific video identified by ID.
Note: When using search method you got all the same information for each video so you do not need to call this metod when using results from search method!

<?php
function EpornerAPICall($api_url, $params) {
$url = $api_url . '?' . http_build_query($params);
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$results = curl_exec($ch);
curl_close($ch);
return $results;
}
function getEpornerVideoById($id, $thumbsize = 'medium', $format = 'json') {
$api_url = 'https://www.eporner.com/api/v2/video/id/';
$params = array(
'id' => $id,
'thumbsize' => $thumbsize,
'format' => $format
);
$response = EpornerAPICall($api_url, $params);
if($response) {
$json = json_decode($response);
return $json;
}
return false;
}
$video = getEpornerVideoById('ozKfC3UC2Wl', 'medium'); // id 'ozKfC3UC2Wl' and thumb size medium
if($video) {
echo 'Video ID: ' . $video->id . PHP_EOL;
echo 'Video title: ' . $video->title . PHP_EOL;
echo 'Video keywords: ' . $video->keywords . PHP_EOL;
echo 'Video views: ' . $video->views . PHP_EOL;
echo 'Video rate: ' . $video->rate . PHP_EOL;
echo 'Video url: ' . $video->url . PHP_EOL;
echo 'Video added: ' . $video->added . PHP_EOL;
echo 'Video length_sec: ' . $video->length_sec . PHP_EOL;
echo 'Video length_min: ' . $video->length_min . PHP_EOL;
echo 'Video embed: ' . $video->embed . PHP_EOL;
echo 'Video default_thumb size: ' . $video->default_thumb->size . PHP_EOL;
echo 'Video default_thumb width: ' . $video->default_thumb->width . PHP_EOL;
echo 'Video default_thumb height: ' . $video->default_thumb->height . PHP_EOL;
echo 'Video default_thumb src: ' . $video->default_thumb->src . PHP_EOL;
foreach($video->thumbs as $thumb_num => $thumb) {
echo 'Thumb #' . $thumb_num . ' Size: '.$thumb->size . ' Width: '.$thumb->width . ' Height: '.$thumb->height . ' Src: '.$thumb->src . PHP_EOL;
}
} else {
//we have an error : (
}
?>
