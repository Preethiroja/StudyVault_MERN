import ForceGraph2D from "react-force-graph-2d";
export default function GraphVisualization({ nodes, links }) {
  return <ForceGraph2D graphData={{ nodes, links }} nodeLabel="name" nodeAutoColorBy="group" width={900} height={500} />;

}