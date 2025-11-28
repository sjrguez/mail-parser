  /**
   * Extract all links from HTML or text content
   */
  export const extractLinks = (content: string): string[] => {
    const links: string[] = [];
    
    // Extract links from HTML (href attributes)
    const htmlLinkRegex = /href=["']([^"']+)["']/gi;
    let match;
    while ((match = htmlLinkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }
    
    return links;
  }
