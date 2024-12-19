import { cloneGithubRepo, createNewArtifactFolder } from "./src/utils";

const result = await createNewArtifactFolder(
  "/Users/jacobwaldor/FractalBootcamp/ClaudeEnvironment/gitexperiment",
  "test" + Date.now()
);
if (result) {
  await cloneGithubRepo(result);
} else {
  console.log("Failed to create new artifact folder");
}
