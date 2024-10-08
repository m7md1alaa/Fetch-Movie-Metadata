const chokidar = require("chokidar");

const path = require("path");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");

// Bearer token for the TMDB API
const bearerToken ="eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmOGNkNmQzY2NlNGY0Yjg1NGQ1NDU0ZDE3MTM4MTljNCIsInN1YiI6IjY1YTNkZjViYmMyY2IzMDBjMjAyMzNjYiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.sK3ecnag7aLvwmckYuADNhOYi775wkH58xjw63fhwVc";

// Directory to watch
const watchDirectory = "/Volumes/mohdalaa 3/Series and movies/Movies";

// Words/phrases to remove from directory names
const removeWords = [
  "\\[YTS\\.AM\\]",
  "\\[YTS\\.MX\\]",
  "\\[YTS\\.AG\\]",
  "\\[BluRay\\]",
  "BluRay\\.x264",
  "\\[WEBRip\\]",
  "\\[1080p\\]",
  "1080p",
  "\\[720p\\]",
  "720p",
  "\\[5\\.1\\]",
  "AAC5",
  "AAC5\\.1",
  "\\-",
  "\\_",
  "\\.",
];

// Function to get movie poster by title
const getMoviePoster = async (title, dirPath) => {
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        params: {
          query: title,
        },
      }
    );

    if (response.data.results.length > 0) {
      const movie = response.data.results[0];
      const posterPath = movie.poster_path;
      const posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;

      // Download the poster
      const imageResponse = await axios.get(posterUrl, {
        responseType: "stream",
      });

      const iconPath = path.join(dirPath, `${title}.png`);
      const writer = fs.createWriteStream(iconPath);

      imageResponse.data.pipe(writer);

      writer.on("finish", () => {
        console.log(`Poster saved as ${title}.png`);

        // Set the icon for the directory
        setDirectoryIcon(dirPath, iconPath);
      });

      writer.on("error", (err) => {
        console.error("Error writing the file:", err);
      });
    } else {
      console.log("Movie not found.");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

// Function to set the directory icon using AppleScript
const setDirectoryIcon = (dirPath, iconPath) => {
  const appleScript = `
    tell application "Finder"
      set target of Finder window 1 to POSIX file "${dirPath}"
      set icon of folder (POSIX file "${dirPath}") to (POSIX file "${iconPath}" as alias)
    end tell
  `;

  exec(
    `osascript -e '${appleScript.replace(/'/g, "\\'")}'`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error setting directory icon: ${error}`);
        return;
      }
      console.log(`Directory icon set successfully.`);
    }
  );
};

// Initialize the watcher to watch directories in the specified path
const watcher = chokidar.watch(watchDirectory, {
  persistent: true,
  depth: 0, // Only watch the top-level directories
  ignoreInitial: true, // Ignore the initial add events
});

// Event listener for adding new directories
watcher.on("addDir", (directoryPath) => {
  console.log(`Directory added: ${directoryPath}`);

  // Extract the base directory name
  let dirName = path.basename(directoryPath);

  // Remove unwanted words/phrases from the directory name
  removeWords.forEach((word) => {
    const regex = new RegExp(word, "gi");
    dirName = dirName.replace(regex, "").trim();
  });

  // Extract and remove the year in parentheses, e.g., "(2015)"
  dirName = dirName.replace(/\(\d{4}\)/, "").trim();

  // Restore spaces between words that were concatenated
  dirName = dirName.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Replace multiple spaces with a single space
  dirName = dirName.replace(/\s+/g, " ").trim();

  // Log the cleaned movie name
  console.log(`Cleaned directory name: ${dirName}`);

  // Fetch the movie poster
  getMoviePoster(dirName, directoryPath);
});

// Handle errors for the watcher
watcher.on("error", (error) => {
  console.error("Watcher error:", error);
});

console.log(`Watching for new directories in ${watchDirectory}`);
