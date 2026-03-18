# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Ursula El-Khoury | 340994 |
| Sarah Badr | 341366 |
| Matthias Wyss | 329884 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Dataset

> This project relies on several open datasets describing the Swiss public transport network, geographic infrastructure, and socioeconomic indicators. These datasets are well documented, publicly available, and widely used in mobility research, making them appropriate for a visualization-focused project with limited preprocessing.

> - GTFS: https://data.opentransportdata.swiss/fr/dataset/timetable-2026-gtfs2020. 
> Contains complete schedule of Swiss public transport and includes information about stops, routes, trips, and transfer times
> - OpenStreetMap: https://planet.osm.ch/. 
> Provides detailed information about roads, pedestrian paths, and urban infrastructure 
> - Population density grid: https://www.bfs.admin.ch/bfs/fr/home/statistiques/population/effectif-evolution.assetdetail.36249009.html 
> - Real estate price statistics: https://www.bfs.admin.ch/bfs/fr/home/statistiques/prix/prix-immobilier.html
> - Employment distribution: https://www.bfs.admin.ch/bfs/fr/home/services/geostat/geodonnees-statistique-federale/etablissements-emplois/statistique-structurel-entreprises-statent-depuis-2011.assetdetail.36073027.html 
> and commune distribution: https://www.agvchapp.bfs.admin.ch/fr/boundaries?SnapshotDate=01.01.2026&Unit=Communes
> - Public transport usage indicators: https://www.bfs.admin.ch/bfs/fr/home/statistiques/mobilite-transports/enquetes/oev.assetdetail.36035738.html 



### Problematic

> Switzerland is often perceived as having one of the most efficient public transport systems in the world. However, accessibility to this network is not evenly distributed across the country. Geographic constraints, service frequency, infrastructure density, and urban concentration can significantly affect how easily people can reach major transport hubs or essential services. While many existing tools display transport routes or allow users to compute individual journeys, they rarely provide a nationwide view of accessibility and how it varies spatially.

> This project aims to explore the following central question: how accessible is the Swiss public transport network across the country, and what factors explain the differences in accessibility between regions? In particular, the visualization focuses on how easily residents can reach major railway hubs (IC stations) using multimodal public transport, considering door-to-door travel time including walking, local transport (bus, tram, metro), transfers, and waiting times.

> By combining open mobility datasets (GTFS timetables) with geographic and socioeconomic data such as population density, housing prices, employment distribution, and public transport usage, the project seeks to highlight patterns between transport accessibility and regional characteristics. The visualization will compute accessibility metrics such as travel time to the nearest IC station, connectivity scores of stations, transfer complexity, and the number of destinations reachable within a given time threshold.

> The resulting interactive map will display accessibility through tools such as isochrone maps, accessibility heatmaps, and comparative visualizations, allowing users to explore disparities between urban and rural areas, mountainous regions and the Swiss plateau, or regions with varying levels of infrastructure density.

> The main objective is to provide an intuitive and data-driven overview of how mobility infrastructure shapes daily accessibility in Switzerland. The visualization targets a broad audience including students, researchers, urban planners, and the general public interested in understanding how transport networks influence regional connectivity, commuting possibilities, and territorial inequalities.


### Exploratory Data Analysis

> The exploratory data analysis and preprocessing of the datasets are conducted in a dedicated Jupyter notebook located at analysis/analysis.ipynb. This notebook contains all steps required to prepare the data for the visualization, including data loading, cleaning, and transformation.

### Related work

> - What others have already done with the data?

> A first source of inspiration is [isochrone.ch](https://www.isochrone.ch/?origin=Parent8504100), which visualizes travel-time isochrones from a given location. These maps show areas reachable within a certain time using public transport. While this approach highlights how accessibility varies spatially from a single point, it does not provide a global overview of accessibility across the entire country or allow comparisons between regions.

> Another reference is the project [Switzograms](https://rubenfiszel.github.io/switzograms/visualization/dist/map.html#), which presents interactive visualizations of Swiss geographic and statistical datasets. The map interface demonstrates how spatial data can reveal interesting national patterns through interactive exploration. However, this project focuses on statistical distributions rather than mobility accessibility or transport network analysis.

> - Why is your approach original?

> More generally, common mobility tools such as journey planners from Swiss Federal Railways allow users to compute travel routes between two locations using multimodal transport. These platforms provide detailed routing information but operate at the individual trip level and do not offer aggregate visualizations of accessibility or regional inequalities.

> The originality of this project lies in combining transport network analysis with socioeconomic and geographic indicators to create a nationwide accessibility visualization. Instead of computing routes for specific trips, the project evaluates accessibility metrics such as door-to-door travel time to major railway hubs, connectivity scores, transfer complexity, and the number of reachable destinations within a given time threshold. By integrating additional datasets such as population density, housing prices, and employment distribution, the visualization aims to explore how transport accessibility interacts with urban development and regional disparities.

> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).

> In terms of visual inspiration, the project draws from isochrone-based mapping techniques, geographic heatmaps, and interactive spatial visualizations commonly used in urban mobility studies. These approaches allow users to intuitively explore spatial patterns and inequalities in infrastructure accessibility. The goal is therefore to combine these visualization techniques with Swiss open transport data to produce an interactive map that highlights how accessibility varies across Switzerland’s diverse geography.

> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

> Nothing to report.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

