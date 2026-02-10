import ForceGraph2D from "react-force-graph-2d";

export default function GraphVisualization({ nodes, links }) {
  return (
    <ForceGraph2D
      graphData={{ nodes, links }}
      width={900}
      height={500}
      backgroundColor="#ffffff" // Clean white background
      
      /* --- Custom Bubble Rendering --- */
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = node.name;
        // Adjust radius based on importance, similar to the reference size variations
        const radius = (node.val || 20) / globalScale; 
        
        // 1. Draw Main Bubble (Soft Grey)
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#eeeeee"; 
        ctx.fill();

        // 2. Draw Progress Accent (The Green Bar at the bottom)
        ctx.beginPath();
        // Draws an arc only at the bottom 25% of the circle
        ctx.arc(node.x, node.y, radius, 0.2 * Math.PI, 0.8 * Math.PI, false);
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = "#4ade80"; // Bright green
        ctx.stroke();

        // 3. Draw Central Text Label
        const fontSize = radius / 2.5;
        ctx.font = `bold ${fontSize}px "Plus Jakarta Sans"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#166534'; // Dark green text for readability
        
        // Wrap text if it's too long for the bubble
        const lines = label.split(' ');
        lines.forEach((line, i) => {
          ctx.fillText(line, node.x, node.y + (i * fontSize) - (lines.length > 1 ? fontSize/2 : 0));
        });
      }}

      /* --- Link Styling --- */
      linkColor={() => 'rgba(0,0,0,0.05)'} // Nearly invisible lines like the reference
      linkWidth={1}
    />
  );
}