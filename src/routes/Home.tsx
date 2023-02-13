import React from "react";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import axios from "axios";

export default class Home extends React.Component<{}, { loading: boolean; commons: any[]; didSearch: boolean; rateLimit: number }> {
	constructor(props: any) {
		super(props);
		this.state = { loading: false, commons: [], didSearch: false, rateLimit: 0 };
	}

	// Calculate minutes difference between now and a unix timestamp
	getMinutesDifference(unixTimestamp: any) {
		var diff = Math.abs(new Date().getTime() - unixTimestamp * 1000);
		return Math.floor(diff / 1000 / 60);
	}

	// Get all followers of a GitHub user, while respecting pagination
	async GetFollowers(username: any) {
		var response = await axios.get(`https://api.github.com/users/${username}/followers?per_page=100`).catch((error) => {
			console.log(`Error fetching from GitHub API!`, error);
			// If rate limit is reached, set rateLimit to state
			if (error.response.status === 403) this.setState({ rateLimit: error.response.headers["x-ratelimit-reset"] });
		});
		if (!response) return [];

		let followers = response.data;

		// Parse pagination headers
		if (response.headers.link) {
			// Find all matches for page=1, page=2, etc.
			var pageStrings = response.headers.link.match(/page=\d+/g);
			// Loop pageStrings and extract page number
			var pages = pageStrings.map((pageString: any) => {
				return Number(pageString.match(/\d+/g));
			});
			// Get the highest page number
			var maxPage = Math.max(...pages);

			// Loop through all remaining pages and get followers
			for (var i = 2; i <= maxPage; i++) {
				var response = await axios.get(`https://api.github.com/users/${username}/followers?page=${i}&per_page=100`).catch((error) => {
					console.log(`Error fetching from GitHub API!`, error);
					// If rate limit is reached, set rateLimit to state
					if (error.response.status === 403) this.setState({ rateLimit: error.response.headers["x-ratelimit-reset"] });
				});
				if (!response) continue;

				// Add followers to array
				followers = followers.concat(response.data);
			}
		}

		return followers;
	}

	// Handle form submission
	handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		// Disable rateLimit
		this.setState({ rateLimit: 0 });

		// Reset common followers
		this.setState({ commons: [] });

		// Set did search
		this.setState({ didSearch: true });

		// Disable the button
		this.setState({ loading: true });

		// Get form data
		const formData = new FormData(event.currentTarget);
		const data = Object.fromEntries(formData.entries());

		// Query GitHub API
		const followers1 = await this.GetFollowers(data.GitHub1);
		const followers2 = await this.GetFollowers(data.GitHub2);

		// Find common followers
		const commonFollowers = followers1.filter((follower: any) => followers2.some((f: any) => f.login === follower.login));

		// Set common followers to state
		this.setState({ commons: commonFollowers });

		// Enable the button
		this.setState({ loading: false });
	};

	render() {
		return (
			<form onSubmit={this.handleSubmit} className="d-flex align-items-center justify-content-center h-auto py-5">
				<div className="rounded bg-light p-4">
					{this.state.rateLimit ? <Alert variant="danger">You have reached the GitHub API rate limit. Please try again later in {this.getMinutesDifference(this.state.rateLimit)} minutes.</Alert> : null}
					<h3>Common Followers Finder</h3>
					<p>A tool for finding common followers between two accounts on GitHub.</p>
					<p className="mb-2">This tool uses the free GitHub API. Please enter valid GitHub usernames.</p>
					<div className="form-group">
						<input type="text" className="form-control" placeholder="GitHub username #1" name="GitHub1" required />
					</div>
					<div className="form-group mt-3">
						<input type="text" className="form-control" placeholder="GitHub username #2" name="GitHub2" required />
					</div>
					<div className="form-group mt-3">
						<p className="mb-2">Please be patient as the GitHub API's ratelimits make it so this can sometimes take a minute.</p>
						<Button disabled={this.state?.loading} variant="primary" type="submit" className="w-100">
							{!this.state?.loading ? "Search followers" : "Please wait..."}
						</Button>
					</div>
					{this.state.didSearch && !this.state?.loading && !this.state.rateLimit ? <p className="mt-3 mb-0">({this.state.commons.length}) common followers were found:</p> : null}
					{this.state?.commons?.length > 0 ? (
						<>
							<pre className="mb-0 mt-3 bg-dark text-light p-3">
								{Object.keys(this.state.commons)
									.map((key) => this.state.commons[parseInt(key)].login)
									.join("\n")}
							</pre>
						</>
					) : null}
				</div>
			</form>
		);
	}
}
