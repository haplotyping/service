$( function() {
    
    //define variables
    var apiLocation = $("body").data("api");
    var rootLocation = $("body").data("root");
    var operation = $("body").data("operation");    
    var identifier = $("body").data("identifier");    
    var searchParams = new URLSearchParams(window.location.search)    
    var tooltipContainer = $("main");
    
    //use session storage    
    if(!("apiInterfaceSelectedDatasets" in sessionStorage)) {
        var selectedDatasets = [];
        sessionStorage.setItem("apiInterfaceSelectedDatasets", JSON.stringify(selectedDatasets));
    }    
    
    function swapSelectedDatasets(data,variety) {
        var selectedDatasets = JSON.parse(sessionStorage.getItem("apiInterfaceSelectedDatasets"));
        var newSelectedDatasets = [];
        var found = false;
        if("uid" in data && "type" in data && (data["type"]=="kmer" || data["type"]=="split")) {
            for(entry in selectedDatasets) {
                if(selectedDatasets[entry] instanceof Object && !Array.isArray(selectedDatasets[entry]) 
                   && "uid" in selectedDatasets[entry]) {
                    if(!(selectedDatasets[entry]["uid"]==data["uid"])) {
                        newSelectedDatasets.push(selectedDatasets[entry]);
                    } else {
                        found = true;
                    }
                }
            }
            if(!found) {
                var newEntry = {"uid": data.uid, "type": data.type,
                                "collection": data.collection, 
                                "variety": variety};                
                newSelectedDatasets.push(newEntry);
                sessionStorage.setItem("apiInterfaceSelectedDatasets", JSON.stringify(newSelectedDatasets));
                setBasket();
                return true;
            } else {
                sessionStorage.setItem("apiInterfaceSelectedDatasets", JSON.stringify(newSelectedDatasets));
                setBasket();
                return false;
            }
        } else {
            setBasket();
            return false;
        }
    }
    
    function deleteSelectedDatasets(uid) {
        var selectedDatasets = JSON.parse(sessionStorage.getItem("apiInterfaceSelectedDatasets"));
        var newSelectedDatasets = [];
        for(entry in selectedDatasets) {
            if(selectedDatasets[entry] instanceof Object && !Array.isArray(selectedDatasets[entry]) 
               && "uid" in selectedDatasets[entry]) {
                if(!(selectedDatasets[entry]["uid"]==uid)) {
                    newSelectedDatasets.push(selectedDatasets[entry]);
                } 
            }
        }
        sessionStorage.setItem("apiInterfaceSelectedDatasets", JSON.stringify(newSelectedDatasets));
        setBasket();
    }
    
    function checkSelectedDatasets(uid) {
        var selectedDatasets = JSON.parse(sessionStorage.getItem("apiInterfaceSelectedDatasets"));
        for(entry in selectedDatasets) {
            if(selectedDatasets[entry] instanceof Object && !Array.isArray(selectedDatasets[entry]) 
               && "uid" in selectedDatasets[entry]) {
                if(selectedDatasets[entry]["uid"]==uid) {                                        
                    return true;
                } 
            } 
        }
        return false;
    }
    
    function getSelectedDatasets() {
        var selectedDatasets = JSON.parse(sessionStorage.getItem("apiInterfaceSelectedDatasets"));
        return selectedDatasets;
    }
    
    function setBasket() {
        var selectedDatasets = JSON.parse(sessionStorage.getItem("apiInterfaceSelectedDatasets"));
        $("div#basket").html("").css("visibility", "hidden");      
        var basketButton = $("<button class=\"btn btn-sm fa-solid fa-basket-shopping text-white\"></button>");        
        $("div#basket").append($("<span role=\"button\"/>").text(
            selectedDatasets.length+" selected dataset(s)").append(basketButton)
           .click(function(event) {
              event.preventDefault();
              $(location).prop("href", "datasets/");
              return false;
           }));
        if(selectedDatasets.length>0) {
            $("div#basket").css("visibility", "visible");
        }
    }
        
    
    function visualizeKmerDensity(container,datasetUid,sequence,response,title,collection) {
        container.addClass("overflow-x-auto");
        var k = response.info.kmer_length;
        var n = sequence.length - k + 1;
        if(n<=0) {
            container.append($("<div/>")
                               .append($("<strong/>").text(title))
                               .append($("<span class=\"small\"/>").text(", "+collection))
                               .append($("<span class=\"text-warning bg-dark mx-1\"/>")
                                       .text("sequence too short! (k-mer size is "+k+")")));    
        } else {
            container.append($("<div/>")
                               .append($("<strong/>").text(title))
                               .append($("<span class=\"small\"/>").text(", "+collection))
                               .append($("<span class=\"small\"/>")
                                       .text(", "+(sequence.length-k+1-response.stats.positive)+" missing k-mers")));  
            var scrollContainer = $("<div/>").addClass("overflow-x-auto");
            container.append(scrollContainer);
            
            var bins = []
            var sequenceKmers = []
            for (var i = 0; i < n; i++) {
                var kmer = sequence.substring(i,i+k);
                sequenceKmers.push(kmer);
                if(kmer in response.kmers) {
                    bins.push({"kmer": kmer, "position": i, "frequency": response.kmers[kmer]});
                } else {
                    bins.push({"kmer": kmer, "position": i, "frequency": 0});
                }
            }
            var toolTip = $("<div/>").addClass("tooltip").text("").css("opacity",0).css("position","absolute");
            tooltipContainer.append(toolTip)
            var containerWidth = container.width(),
                containerHeight = 250,
                marginBottom = 50,
                marginLeft = 40,
                marginTop = 20,
                marginRight = 20;
            var svg = d3.select(scrollContainer.get(0)).append("svg")
                .attr("width", containerWidth)
                .attr("height", containerHeight)
                .attr("viewBox", "0 0 "+(containerWidth)+" "+(containerHeight))
                .attr("preserveAspectRatio","none");
            var g = svg.append("g").attr("transform", "translate(0,0)");

            var kmerResult = $("<div class=\"card mt-3 mb-3\"/>");
            var kmerResultHeader = $("<div "+
                "class=\"card-header font-weight-bold bg-secundary text-dark py-0\"/>");
            var kmerResultButton = $("<button class=\"btn btn-sm fa-solid fa-xmark\"></button>");
            kmerResultButton.click(function(event) {
                g.selectAll("rect").classed("selected", false);
                event.preventDefault();
                kmerResultHeaderText.text("");
                kmerResultBody.text("");
                kmerResult.hide();
                return false;
            });
            kmerResultHeaderText = $("<div class=\"float-start\"/>").text("");
            kmerResultHeader.append(kmerResultHeaderText);
            kmerResultHeader.append($("<div class=\"float-end\"></div>").append(kmerResultButton));
            kmerResult.append(kmerResultHeader);                  
            var kmerResultBody = $("<div class=\"card-body\"/>");
            kmerResult.append(kmerResultBody).hide();   
            container.append(kmerResult);

            var x = d3.scaleLinear()
                  .domain([0,sequence.length-k+1])     
                  .range([0, containerWidth-marginLeft-marginRight]);
            g.append("g")
                  .attr("transform", "translate(" + (marginLeft+(x(1)/2))+ "," + (containerHeight-marginBottom) + ")")
                  .call(d3.axisBottom(x).ticks(Math.min((sequence.length - k + 1),10)).tickFormat(d3.format("d")));

            var histogram = d3.histogram()
                  .domain(x.domain())
                  .thresholds(x.ticks(sequence.length));

            var y = d3.scaleLinear()
                  .range([containerHeight-marginBottom,marginTop]);
                  y.domain([0, response.stats.maximum]);

            g.append("g")
                  .attr("transform", "translate(" + marginLeft + ",0)")
                  .call(d3.axisLeft(y).tickFormat(d3.format("d")));
                  
                  
            g.append("g").selectAll(".rect1")
                  .data(bins)
                  .enter()
                  .append("rect")
                    .attr("x", marginLeft)
                    .attr("transform", function(d) { return "translate(" + x(d.position) + ", "+y(d.frequency)+" )"; })
                    .attr("width", function(d) { return x(1); })
                    .attr("height", function(d) { return y(0)-y(d.frequency); })
                    .attr("class", "found")
                    .attr("data-kmer", function(d) { return d.kmer; })
                    .attr("data-frequency", function(d) { return d.frequency; })
                    .on("mouseover", function(e) {                        
                        d3.select(this).classed("hover", true);
                        toolTip.css("opacity",1);
                        toolTip.text(e.target.getAttribute("data-kmer")+": "+e.target.getAttribute("data-frequency")+"x");
                        e.stopPropagation();
                      })
                    .on("mouseout", function(e) {
                         d3.select(this).classed("hover", false);
                         toolTip.css("opacity",0);
                         toolTip.text("");
                         e.stopPropagation();
                    }).on("mousemove", function(e) { 
                        let coor = d3.pointer(e,tooltipContainer[0]);
                        toolTip
                            .css("left", coor[0] + "px")
                            .css("top", coor[1] + "px"); 
                        e.stopPropagation();                     
                    }).on("click", function(e) { 
                        var kmer = e.target.getAttribute("data-kmer");
                        var frequency = e.target.getAttribute("data-frequency");
                        displayKmerInfo(datasetUid,kmer,frequency,sequenceKmers,g,kmerResult,kmerResultBody,
                            kmerResultHeaderText,toolTip,marginBottom);                                        
                    });
                    

            g.append("g").selectAll(".rect2")
                  .data(bins)
                  .enter()
                  .append("rect")
                    .attr("x", marginLeft)
                    .attr("transform", function(d) { return "translate(" + x(d.position) + ", "+
                                (containerHeight-(marginBottom/2))+" )"; })
                    .attr("width", function(d) { return x(1); })
                    .attr("height", function(d) { if(d.frequency==0) {return 10;} else {return 0;} })
                    .attr("class", "missing")
                    .attr("data-kmer", function(d) { return d.kmer; })
                    .on("mouseover", function(e) {
                        d3.select(this).classed("hover", true);
                        toolTip.css("opacity",1);
                        toolTip.text(e.target.getAttribute("data-kmer"));
                        e.stopPropagation();
                      })
                    .on("mouseout", function(e) {
                         d3.select(this).classed("hover", false);
                         toolTip.css("opacity",0);
                         toolTip.text("");
                         e.stopPropagation();
                    }).on("mousemove", function(e) { 
                        let coor = d3.pointer(e,tooltipContainer[0]);
                        toolTip
                            .css("left", coor[0] + "px")
                            .css("top", coor[1] + "px"); 
                        e.stopPropagation();                         
                    }).on("click", function(e) { 
                        var kmer = e.target.getAttribute("data-kmer");
                        displayKmerInfo(datasetUid,kmer,0,sequenceKmers,g,kmerResult,kmerResultBody,
                            kmerResultHeaderText,toolTip,marginBottom);                     
                    });
            
            

            function zoomIn() {     
                var nWidth = Math.min(10*containerWidth,Math.floor(1.1*svg.attr("width")));
                svg.attr("width", nWidth);
                svg.attr("viewBox", "0 0 "+(containerWidth)+" "+(containerHeight));
            }

            function zoomOut() {
                var nWidth = Math.max(containerWidth,Math.ceil(svg.attr("width")/1.1));
                svg.attr("width", nWidth);
                svg.attr("viewBox", "0 0 "+(containerWidth)+" "+(containerHeight));
            }

            function resetZoom() {
                svg.attr("width", containerWidth);
                svg.attr("viewBox", "0 0 "+(containerWidth)+" "+(containerHeight));
            }
            
            var zoomInButton = $("<button class=\"btn btn-sm fa-solid fa-magnifying-glass-plus float-end\"/>")
                                    .on("click", function(e) {zoomIn();});
            var zoomOutButton = $("<button class=\"btn btn-sm fa-solid fa-magnifying-glass-minus float-end\"/>")
                                    .on("click", function(e) {zoomOut();});
            var zoomResetButton = $("<button class=\"btn btn-sm fa-solid fa-magnifying-glass float-end\"/>")
                                    .on("click", function(e) {resetZoom();});
            container.prepend(zoomOutButton);
            container.prepend(zoomResetButton);                       
            container.prepend(zoomInButton);
            
        }
    }
    
    function displayKmerInfo(datasetUid,kmer,frequency,sequenceKmers,svg,kmerResult,kmerResultBody,
                              kmerResultHeaderText,toolTip,marginBottom) {
        svg.selectAll("rect").classed("selected", false);
        svg.selectAll("rect")
              .filter(function() {
                return d3.select(this).attr("data-kmer") == kmer;
              }).classed("selected", true); 
        kmerResultHeaderText.text(kmer+": "+frequency+"x");
        kmerResultBody.text("");
        kmerResultWarning = $("<div class=\"alert alert-warning\" role=\"alert\"/>").text("Loading k-mer data...");
        kmerResultBody.append(kmerResultWarning);
        kmerResult.show();
        
        function drawKmers(data, x, top, step, type = "main", lineX=0, previousYValues) { 
        
            var maxWidth = 0;
            var yValues = {};
            if(type=="left"|type=="right") {
                data.sort(function(a, b){return a.kmer.split("").reverse().join("")>b.kmer.split("").reverse().join("")}); 
            } else {
                data.sort(function(a, b){return a.kmer>b.kmer});    
            }
            
            //don't use empty data to estimate size
            if(data.length==0) {
                var testData = [{"kmer": kmer, "frequency": 0}];
            } else {
                var testData = data;
            }            
            var temporaryG = graphsvg.append("g")
                .style("font", "14px sans-serif")
                .style("fill", "#000")
                .selectAll("text")
                .data(testData)
                .join("text")
                .each(function(d) { d.y = top;
                                    yValues[d.kmer] = d.y;
                                    top += step;})
                .attr("x", d => x)
                .attr("y", d => d.y)
                .attr("class", "temporary")
                .text(d => (type == "left") ? d.kmer[0] : 
                           ((type == "right") ? d.kmer[d.kmer.length - 1] : d.kmer) );
                                        
            linkData = [];
            
            graphsvg.selectAll("text.temporary")
                .join(testData)
                   .each(function(d) { 
                       d.bbox = this.getBBox(); 
                       maxWidth = Math.max(maxWidth,d.bbox.width);
                       for (nkmer in previousYValues) {
                           let d1 = Object.assign({}, d);
                           if(d.frequency==0) {
                               //don't do anything
                           } else if(type=="right") {
                               if(nkmer.slice(1)==d1.kmer.slice(0,-1)) {
                                   d1.y2=previousYValues[nkmer];
                                   linkData.push(d1);
                               }
                           } else if(type=="left") {
                               if(nkmer.slice(0,-1)==d1.kmer.slice(1)) {
                                   d1.y2=previousYValues[nkmer];
                                   linkData.push(d1);
                               }
                           }
                       }
                   })
                   .remove();  
            if (lineX>0) {
                if (type=="left"||type=="right") {
                    graphsvg.append("g")
                        .selectAll("line")
                        .data(linkData)
                        .join("line")
                        .attr("stroke","red")
                        .attr("stroke-width","2")
                        .attr("x1", d => x)
                        .attr("y1", d => d.y)
                        .attr("x2", d => lineX)
                        .attr("y2", d => d.y2);
                } 
            }                                  
            
            graphsvg.append("g")
                .style("font", "14px sans-serif")
                .style("fill", "#000")
                .selectAll("text")
                .data(data)
                .join("text")
                .attr("x", d => (type == "left") ? (x - d.bbox.width - 10) : 
                      ((type == "right") ? x + 10 : (x-(d.bbox.width/2)) ))
                .attr("y", d => d.y)
                .text(d => (type == "left") ? d.kmer[0] : 
                           ((type == "right") ? d.kmer[d.kmer.length - 1] : d.kmer) );
               
               graphsvg.append("g")
                .selectAll("rect")
                .data(data)
                .join("rect")
                .attr("x", d => (type == "left") ? (x - d.bbox.width - 20) : 
                      ((type == "right") ? x : (x-(d.bbox.width/2)-10) ))
                .attr("y", d => d.y - 20 + (20-d.bbox.height))
                .attr("width", d => d.bbox.width + 20)
                .attr("height", 20)
                .attr("data-kmer", function(d) {return d.kmer; })
                .attr("data-frequency", function(d) { return d.frequency; })
                .attr("class", d => (kmer==d.kmer) ? "kmer selected" : 
                              (sequenceKmers.includes(d.kmer) ? "kmer sequence" : "kmer"))
                  .style("opacity", "0.5")
                  .on("mouseover", function(e) {
                    d3.select(this).classed("hover", true);
                    toolTip.css("opacity",1);
                    toolTip.text(e.target.getAttribute("data-kmer")+": "+e.target.getAttribute("data-frequency")+"x");
                  })
                .on("mouseout", function() {
                     d3.select(this).classed("hover", false);
                     toolTip.css("opacity",0);
                     toolTip.text("");
                }).on("mousemove", function(e) { 
                    let coor = d3.pointer(e,tooltipContainer[0]);
                    toolTip
                        .css("left", (coor[0]) + "px")
                        .css("top", (coor[1]) + "px");      
                    e.stopPropagation();                    
                })
                .on("click", function(e) { 
                    var dkmer = e.target.getAttribute("data-kmer");
                    var dfrequency = e.target.getAttribute("data-frequency");
                    displayKmerInfo(datasetUid,dkmer,dfrequency,sequenceKmers,svg,kmerResult,kmerResultBody,
                                    kmerResultHeaderText,toolTip,marginBottom);                                        
            });                        
            
                        
            return [maxWidth+20, yValues];
        }
        
        
        
        
        var graphsvg = d3.select(kmerResultBody.get(0)).append("svg");
        var kmerOffset = 20, kmerHeight = 30, kmerDistance = 30;        
        $.ajax({
          url: apiLocation+"kmer/"+encodeURIComponent(datasetUid),
          type: "post",
          dataType: "json",
          contentType: "application/json",  
          data: JSON.stringify({"kmers": [kmer], "mismatches": 1}),
          success: function(responseMainKmer) {
              var kmerData = [];
              for (rkmer in responseMainKmer.kmers) {
                  kmerData.push({"kmer": rkmer, "frequency": responseMainKmer.kmers[rkmer]});
              }
              //create container
              var maxNumber = Math.max(16,kmerData.length);
              var containerWidth = kmerResultBody.width(),
                  containerHeight = maxNumber * kmerHeight;
              graphsvg.attr("width", containerWidth)
                      .attr("height", containerHeight)
                      .append("g")
                      .attr("transform", "translate(0,0)");                      

              var kmerWidth, kmerYvalues;
              [kmerWidth,kmerYvalues] = drawKmers(kmerData, (containerWidth/2), kmerOffset, kmerHeight);
              
              left1Kmers = ["A"+kmer.slice(0,-1),"C"+kmer.slice(0,-1),"G"+kmer.slice(0,-1),"T"+kmer.slice(0,-1)];
              left2Kmers = ["AA"+kmer.slice(0,-2),"AC"+kmer.slice(0,-2),"AG"+kmer.slice(0,-2),"AT"+kmer.slice(0,-2),
                            "CA"+kmer.slice(0,-2),"CC"+kmer.slice(0,-2),"CG"+kmer.slice(0,-2),"CT"+kmer.slice(0,-2),
                            "GA"+kmer.slice(0,-2),"GC"+kmer.slice(0,-2),"GG"+kmer.slice(0,-2),"GT"+kmer.slice(0,-2),
                            "TA"+kmer.slice(0,-2),"TC"+kmer.slice(0,-2),"TG"+kmer.slice(0,-2),"TT"+kmer.slice(0,-2)];
              right1Kmers = [kmer.slice(1)+"A",kmer.slice(1)+"C",kmer.slice(1)+"G",kmer.slice(1)+"T"];
              right2Kmers = [kmer.slice(2)+"AA",kmer.slice(2)+"AC",kmer.slice(2)+"AG",kmer.slice(2)+"AT",
                             kmer.slice(2)+"CA",kmer.slice(2)+"CC",kmer.slice(2)+"CG",kmer.slice(2)+"CT",
                             kmer.slice(2)+"GA",kmer.slice(2)+"GC",kmer.slice(2)+"GG",kmer.slice(2)+"GT",
                             kmer.slice(2)+"TA",kmer.slice(2)+"TC",kmer.slice(2)+"TG",kmer.slice(2)+"TT"];
              
              neighbouringKmers = left1Kmers.concat(left2Kmers).concat(right1Kmers).concat(right2Kmers);
              $.ajax({
                  url: apiLocation+"kmer/"+encodeURIComponent(datasetUid),
                  type: "post",
                  dataType: "json",
                  contentType: "application/json",  
                  data: JSON.stringify({"kmers": neighbouringKmers, "mismatches": 0}),
                  success: function(responseNeighbouringKmers) {
                      var lw1,lk1Yvalues,rw1,rk1Yvalues;
                      var nl1KmerData = [],nl2KmerData = [],nr1KmerData = [],nr2KmerData = [];
                      for (rkmer in responseNeighbouringKmers.kmers) {
                          if(left1Kmers.includes(rkmer)) {
                              if (responseNeighbouringKmers.kmers[rkmer]>0) {
                                  nl1KmerData.push({"kmer": rkmer, 
                                                   "frequency": responseNeighbouringKmers.kmers[rkmer]});
                              }
                          }
                          if(left2Kmers.includes(rkmer)) {
                              if (responseNeighbouringKmers.kmers[rkmer]>0) {
                                  nl2KmerData.push({"kmer": rkmer, 
                                                   "frequency": responseNeighbouringKmers.kmers[rkmer]});
                              }
                          }
                          if(right1Kmers.includes(rkmer)) {
                              if (responseNeighbouringKmers.kmers[rkmer]>0) {
                                  nr1KmerData.push({"kmer": rkmer, 
                                                   "frequency": responseNeighbouringKmers.kmers[rkmer]});
                              }
                          }
                          if(right2Kmers.includes(rkmer)) {
                              if (responseNeighbouringKmers.kmers[rkmer]>0) {
                                  nr2KmerData.push({"kmer": rkmer, 
                                                   "frequency": responseNeighbouringKmers.kmers[rkmer]});
                              }
                          }
                      }
                      [lw1,lk1Yvalues] = drawKmers(nl1KmerData, (containerWidth/2) - (kmerWidth/2) - 2*kmerDistance, 
                                                   kmerOffset, kmerHeight, "left", 
                                                   (containerWidth/2) - (kmerWidth/2), kmerYvalues);
                      drawKmers(nl2KmerData, (containerWidth/2) - (kmerWidth/2) - (lw1) - 4*kmerDistance, 
                                                   kmerOffset, kmerHeight, "left",  
                                                   (containerWidth/2) - (kmerWidth/2) - (lw1) - 2*kmerDistance, 
                                                   lk1Yvalues);
                      [rw1,rk1Yvalues] = drawKmers(nr1KmerData, (containerWidth/2) + (kmerWidth/2) + 2*kmerDistance, 
                                                   kmerOffset, kmerHeight, "right", 
                                                   (containerWidth/2) + (kmerWidth/2), kmerYvalues);
                      drawKmers(nr2KmerData, (containerWidth/2) + (kmerWidth/2) + (rw1) + 4*kmerDistance, 
                                                   kmerOffset, kmerHeight, "right",  
                                                   (containerWidth/2) + (kmerWidth/2) + (rw1) + 2*kmerDistance, 
                                                   rk1Yvalues);
                      kmerResultWarning.remove();
                  },
                  error: function(jqXHR, textStatus, errorThrown ) {
                      console.log(textStatus);
                  }
              });              
                  
          },
          error: function(jqXHR, textStatus, errorThrown ) {
              console.log(textStatus);
          }
        });
        
    }
    
    function createParents(parents, createLinks=false, createBrackets=true) {
        parents.sort(function(a,b){
            if(a.relation=="mother") {
                return true;
            } else if(b.relation=="mother") {
                return false;
            } else if(a.relation=="father") {
                return false;
            } else {
                return true;
            }
        });
        var container = $("<span class=\"fw-light\"/>");
        if(createBrackets) {
            container.append($("<span class=\"text-dark\" />").text("("));
        }
        for (var i=0; i<parents.length; i++) {
            if(i>0) {
                container.append($("<span class=\"text-dark\"/>").text(" x "));
            }
            if(parents[i].parents) {
                container.append(createParents(parents[i].parents, createLinks, true));
            } else {
                if(createLinks) {
                    container.append($("<span class=\"text-dark\" />").text("["));
                    container.append($("<a class=\"text-decoration-none\"/>").text(parents[i].name)
                                     .attr("href", "variety/"+encodeURIComponent(parents[i].uid)));
                    container.append($("<span class=\"text-dark\" />").text("]"));
                } else {
                    container.append($("<span />").text(parents[i].name));    
                }
            }
        }
        if(createBrackets) {
            container.append($("<span class=\"text-dark\" />").text(")"));
        }
        return container;
    }
    
    function createParentList(parents, onlyDatasets, parentList=[]) {
        var idList = [];
        for (var i=0; i<parentList.length; i++) {
            if("uid" in parentList[i]) {
                idList.push(parentList[i]["uid"]);
            }
        }
        for (var i=0; i<parents.length; i++) {
            if(parents[i].parents) {
                parentList = parentList.concat(createParentList(parents[i].parents, onlyDatasets));
            } else if("uid" in parents[i]) {
                if (!(parents[i]["uid"] in idList)) {
                    if (onlyDatasets && (!("datasets" in parents[i]))) {
                        //
                    } else if (onlyDatasets && (parents[i]["datasets"].length==0)) {
                        //
                    } else {
                        parentList.push(parents[i]);
                        idList.push(parents[i]["uid"]);
                    }
                }
            }
        }
        return parentList;
    }
    
    function createVarietyListEntry(item) {
        var entry = $("<a class=\"list-group-item d-flex justify-content-between align-items-start\"/>")
        entry.attr("href", "variety/"+item.uid);
        var entryContent = $("<div class=\"ms-2 me-auto\"/>");
        entry.append(entryContent);
        var entryContentMain = $("<div/>");
        entryContentMain.append($("<span class=\"fw-bold\"/>").text(item.name));
        if(item.synonyms) {
          entryContentMain.append($("<span class=\"mx-2\"/>").text("-"));
          entryContentMain.append($("<span class=\"small fw-light\"/>").text(
              item.synonyms.replace(/,/g,", ")));
        }
        entryContent.append(entryContentMain);
        var entryContentSub = $("<div/>");
        if(item.origin) {
          entryContentSub.append($("<span class=\"\"/>").text(item.origin.country));
        }
        if(item.year) {
          if(item.origin) {
              entryContentSub.append($("<span/>").text(", "));
          }
          entryContentSub.append($("<span class=\"\"/>").text(item.year.description));
        }
        if(item.parents && item.parents.length>0) {
          if(item.origin||item.year) {
              entryContentSub.append($("<span/>").text(", "));
          }
          entryContentSub.append($("<span class=\"small fw-light\"/>").append(
              createParents(item.parents)));
        }
        entryContentSub.append($("<span class=\"\"/>").html("&nbsp;"));
        entryContent.append(entryContentSub);
        if(item.datasets.length>0) {
          var entryLabel = $("<span class=\"badge bg-primary rounded-pill\"/>");
          if(item.datasets.length==1) {
              entryLabel.text("1 dataset");
          } else {
              entryLabel.text(item.datasets.length+" datasets");
          }
          entry.append(entryLabel);
        }
        return entry;
    }
    
    $(".autocomplete-uid").each(function() {
        $( this ).autocomplete({
          source: function( request, response ) {
              if(request.term.endsWith(" ")) {
                  name = request.term.trim();
              } else {
                  name = request.term.trim()+"%";
              }
              $.ajax( {
                  url: apiLocation+"variety/",
                  type: "get",
                  data: {"name": name},
                  success: function( data ) {
                      response( data.list );
                  }
              } );
            },            
            minLength: 2,
            select: function( event, ui ) {
                $(location).prop("href", "variety/"+encodeURIComponent(ui.item.uid));  
            },
            focus: function() {
            // prevent value inserted on focus
                return false;
            }
        }).autocomplete( "instance" )._renderItem = function( ul, item ) {
            var content = $("<div/>");
            var contentMain = $("<div/>");
            if(item.type=="species") {contentMain.append($("<span/>").text("["));}            
            contentMain.append($("<span class=\"fw-bold\"/>").text(item.name));
            if(item.type=="species") {contentMain.append($("<span/>").text("]"));}
            if(item.synonyms) {
                contentMain.append($("<span class=\"mx-2\"/>").text("-"));
                contentMain.append($("<span class=\"small fw-light\"/>").text(
                      item.synonyms.replace(/,/g,", ")));
            }
            content.append(contentMain);
            var contentSub = $("<div/>");
            if(item.origin) {
                contentSub.append($("<span class=\"\"/>").text(item.origin.country));
            }
            if(item.year) {
                if(item.origin) {
                    contentSub.append($("<span/>").text(", "));
                }
                contentSub.append($("<span class=\"\"/>").text(item.year.description));
            }
            if(item.parents && item.parents.length>0) {
                if(item.origin||item.year) {
                    contentSub.append($("<span/>").text(", "));
                }
                contentSub.append($("<span class=\"small fw-light\"/>").append(
                    createParents(item.parents)));
            }
            contentSub.append($("<span class=\"\"/>").html("&nbsp;"));
            content.append(contentSub);
            return $( "<li>" ).append(content).appendTo( ul );
        };
    });
    
    //always set basket
    setBasket();
    
    if(operation=="variety") {                
    
        if(identifier) {   
            //get info
            $.ajax({
              url: apiLocation+"variety/"+encodeURIComponent(identifier),
              type: "get",
              success: function(response) {
                $("#block-info").removeClass("d-none").html("").show();  
                if(!response.uid) {
                    $(location).prop("href", "variety/");
                } else {
                    var cardContainer = $("<div class=\"card mt-3 mb-3\"/>");
                    var cardHeader = $("<div class=\"card-header font-weight-bold bg-primary text-white\"/>");
                    cardHeader.append($("<span class=\"me-1\"/>").text(
                        (response.type=="species"?"Species":"Variety")+" information"));
                    cardHeader.append($("<strong/>").text(response.name));
                    cardContainer.append(cardHeader);                  
                    var cardBody = $("<div class=\"card-body\"/>");
                    var cardTable = $("<table class=\"table table-bordered table-hover\"/>");
                    var cardTableBody = $("<tbody/>");
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Name"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.name)));
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Type"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.type)));
                    if(response.synonyms) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Synonym"))
                                                       .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                         .text(response.synonyms
                                                                                               .replace(/,/g,", "))));
                    }
                    if(response.species_id) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Species"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.species_name)));
                    }
                    if(response.year) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Year"))
                                                       .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                         .text(response.year.description)));
                    }
                    if(response.origin) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Origin"))
                                                       .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                       .text(response.origin.country+" ("+response.origin.uid+")")));
                    }
                    if(response.breeder_id) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Breeder"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.breeder_name)));
                    }
                    if(response.parents && (response.parents.length>0)) {                        
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Parents"))
                                                       .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                       .append(createParents(response.parents, true, false))));
                        datasetParentList = createParentList(response.parents, true);
                        if(datasetParentList.length>0) {
                            var parentsRow = $("<td class=\"col-3\"/>").attr("scope","row");
                            var parentsTableBody = $("<tbody/>");
                            for (var i=0;i<datasetParentList.length;i++) {
                                var parentsTableRow = $("<tr/>");
                                var parentsTableRowMain = $("<td/>")
                                        .append($("<a class=\"text-decoration-none\"/>").attr("href",
                                       "variety/"+encodeURIComponent(datasetParentList[i].uid))
                                                               .text(datasetParentList[i].name));
                                var parentsTableRowDatasets = $("<td/>");
                                if(datasetParentList[i].datasets && (datasetParentList[i].datasets.length>0)) {
                                    parentsTableRowMain.attr("rowspan",datasetParentList[i].datasets.length);
                                    parentsTableRow.append(parentsTableRowMain);
                                    for (var j=0;j<datasetParentList[i].datasets.length;j++) {
                                        if(j>0) {
                                            parentsTableBody.append(parentsTableRow);
                                            parentsTableRow = $("<tr/>");
                                        }
                                        parentsTableRow.append(
                                                $("<td class=\"small text-sm-center\"/>").text(datasetParentList[i]
                                                                          .datasets[j].type));
                                        var datasetRowName = $("<td class=\"text-sm-end\"/>");
                                        datasetRowName.append($("<a class=\"small text-decoration-none\"/>")
                                                            .text(datasetParentList[i]
                                                                          .datasets[j].collection.name)
                                                            .attr("href",
                                                                  "collection/" + 
                                                                  encodeURIComponent(datasetParentList[i]
                                                                          .datasets[j].collection.uid)));
                                        if(datasetParentList[i].datasets[j].collection.experiment) {
                                            datasetRowName.append($("<span/>").html("&nbsp;"));
                                            datasetRowName.append($("<span class=\"small text-secondary\"/>")
                                               .text(datasetParentList[i].datasets[j].collection.experiment));
                                        }
                                        parentsTableRow.append(datasetRowName.attr("title",datasetParentList[i]
                                                                                 .datasets[j].collection.type));                                    
                                    }
                                } else {
                                    parentsTableRow.append(parentsTableRowMain);
                                }
                                parentsTableBody.append(parentsTableRow);
                            }
                            parentsRow.append($("<table class=\"table table-sm table-bordered\"/>")
                                              .append(parentsTableBody));
                            cardTableBody.append($("<tr/>")
                                                     .append($("<td class=\"col-3\"/>"))
                                                     .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                             .append($("<div class=\"small text-secondary\"/>")
                                                                     .text("parents with dataset:"))
                                                             .append(parentsRow)));
                        }
                    }
                    if(response.offspring && (response.offspring.length>0)) {
                        var offspringRow = $("<td class=\"col-3\"/>").attr("scope","row");
                        var offspringTableBody = $("<tbody/>");
                        for (var i=0;i<response.offspring.length;i++) {
                            var offspringTableRow = $("<tr/>");
                            var offspringTableRowMain = $("<td/>")
                                    .append($("<a class=\"text-decoration-none\"/>").attr("href",
                                   "variety/"+encodeURIComponent(response.offspring[i].uid))
                                                           .text(response.offspring[i].name));
                            var offspringTableRowDatasets = $("<td/>");
                            if(response.offspring[i].datasets && (response.offspring[i].datasets.length>0)) {
                                offspringTableRowMain.attr("rowspan",response.offspring[i].datasets.length);
                                offspringTableRow.append(offspringTableRowMain);
                                for (var j=0;j<response.offspring[i].datasets.length;j++) {
                                    if(j>0) {
                                        offspringTableBody.append(offspringTableRow);
                                        offspringTableRow = $("<tr/>");
                                    }
                                    offspringTableRow.append(
                                            $("<td class=\"small text-sm-center\"/>").text(response.offspring[i]
                                                                      .datasets[j].type));
                                    var datasetRowName = $("<td class=\"text-sm-end\"/>");
                                    datasetRowName.append($("<a class=\"small text-decoration-none\"/>")
                                                        .text(response.offspring[i]
                                                                      .datasets[j].collection.name)
                                                        .attr("href",
                                                              "collection/" + 
                                                              encodeURIComponent(response.offspring[i]
                                                                      .datasets[j].collection.uid)));
                                    if(response.offspring[i].datasets[j].collection.experiment) {
                                        datasetRowName.append($("<span/>").html("&nbsp;"));
                                        datasetRowName.append($("<span class=\"small text-secondary\"/>")
                                                              .text(response.offspring[i].datasets[j].collection.experiment));
                                    }
                                    offspringTableRow.append(datasetRowName.attr("title",response.offspring[i]
                                                                             .datasets[j].collection.type));                                    
                                }
                            } else {
                                offspringTableRow.append(offspringTableRowMain);
                            }
                            offspringTableBody.append(offspringTableRow);
                        }
                        offspringRow.append($("<table class=\"table table-sm table-bordered\"/>").append(offspringTableBody));
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Offspring"))
                                                       .append(offspringRow));
                    }
                    kmerDatasets = [];
                    if(response.datasets && (response.datasets.length>0)) {
                        var datasetsRow = $("<td class=\"col-3\"/>").attr("scope","row");
                        var datasetsTable = $("<table class=\"table table-bordered table-hover\"/>");
                        var datasetsTbody = $("<tbody/>");
                        for (var i=0;i<response.datasets.length;i++) {
                            if(response.datasets[i].type=="kmer" || response.datasets[i].type=="split") {
                                kmerDatasets.push(response.datasets[i]);
                                var datasetSelectionButton = $("<button class=\"btn btn-sm fa-solid\"/>");
                                if(checkSelectedDatasets(response.datasets[i].uid)) {
                                    datasetSelectionButton.addClass("fa-trash");
                                } else {
                                    datasetSelectionButton.addClass("fa-plus");
                                }
                                datasetSelectionButton.data("dataset",response.datasets[i]);
                                datasetSelectionButton.click(function(event) {
                                    event.preventDefault();
                                    var oThis = $(this);
                                    var data = oThis.data("dataset");
                                    if(!swapSelectedDatasets(data,response)) {
                                        oThis.removeClass("fa-trash");
                                        oThis.addClass("fa-plus");
                                    } else {
                                        oThis.removeClass("fa-plus");
                                        oThis.addClass("fa-trash");
                                    }
                                    return false;
                                });
                            } else {
                                var datasetSelectionButton = $("<span/>");                                
                            }
                            var datasetRow = $("<tr/>");
                            datasetRow.append($("<td/>").text(response.datasets[i].type));
                            var datasetRowName = $("<td/>");
                            datasetRowName.append($("<a class=\"text-decoration-none\"/>")
                                                        .text(response.datasets[i].collection.name)
                                                        .attr("href",
                                                              "collection/" + 
                                                              encodeURIComponent(response.datasets[i].collection.uid)));
                            if(response.datasets[i].collection.experiment) {
                                datasetRowName.append($("<div class=\"small text-secondary\"/>")
                                                      .text(response.datasets[i].collection.experiment));
                            }
                            datasetRow.append(datasetRowName);
                            datasetRow.append($("<td/>").text(response.datasets[i].collection.type));
                            datasetRow.append($("<td/>").append(datasetSelectionButton));
                            datasetsTbody.append(datasetRow);
                        }
                        datasetsTable.append(datasetsTbody)
                        datasetsRow.append(datasetsTable);
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Datasets"))
                                                       .append(datasetsRow));
                    }
                    cardTable.append(cardTableBody);
                    cardBody.append(cardTable);                    
                    cardContainer.append(cardBody); 
                    $("#block-info").append(cardContainer);
                    if(kmerDatasets.length>0) {
                        var cardForm = $("<div class=\"card mt-3 mb-3\"/>");
                        var cardFormContainer = $("<form/>");
                        var cardFormHeader = $("<div class=\"card-header font-weight-bold bg-secundary text-dark\"/>");
                        cardFormHeader.append($("<span />").text("Search sequence "+response.name));                        
                        cardFormContainer.append(cardFormHeader);                  
                        var cardFormBody = $("<div class=\"card-body\"/>");
                        var formSelect = $("<select class=\"form-select mb-2\"/>");
                        if(kmerDatasets.length==1) {
                            formSelect.attr("disabled",1);
                        }
                        for (var i=0;i<kmerDatasets.length;i++) {
                            var formOption = $("<option/>").attr("value",kmerDatasets[i].uid);
                            if(kmerDatasets[i].collection.experiment) {
                                formOption.text(kmerDatasets[i].collection.name+" - "+
                                                kmerDatasets[i].collection.experiment+" - "+
                                                kmerDatasets[i].uid);
                            } else {
                                formOption.text(kmerDatasets[i].collection.name+" - "+kmerDatasets[i].uid);
                            }
                            if(i==0) {
                                formOption.attr("selected","1");
                            }
                            formSelect.append(formOption);
                        }
                        cardFormBody.append(formSelect);
                        var formContainer = $("<div class=\"form-floating\"/>");
                        var defaultSequence = (("apiInterfaceSequence" in sessionStorage)? 
                                               sessionStorage.getItem("apiInterfaceSequence") : "");
                        var formTextarea = $("<textarea class=\"form-control\" placeholder=\"Enter sequence\" "+
                                             "id=\"sequence\" style=\"height: 100px\"/>").text(defaultSequence);
                        formContainer.append(formTextarea);
                        var formLabel = $("<label for=\"sequence\"/>").text("Sequence");
                        formContainer.append(formLabel);
                        var formButtons = $("<div class=\"d-grid gap-2 d-md-flex justify-content-md-end\"/>");
                        var formSubmitButton = $("<button class=\"btn btn-primary mt-2 pull-right\"/>")
                                .attr("type","submit").text("Search");
                        if(!(defaultSequence=="")) {
                            var cardResetButton = $("<button class=\"btn fa-solid fa-rotate-left\"></button>");
                            cardFormHeader.append($("<div class=\"float-end\"></div>").append(cardResetButton));
                            cardResetButton.click(function(event) {
                              event.preventDefault();
                              formTextarea.text("");
                              sessionStorage.setItem("apiInterfaceSequence","");
                              cardResetButton.remove();
                              return false;
                            });
                        }
                        formButtons.append(formSubmitButton);
                        formContainer.append(formButtons);
                        cardFormBody.append(formContainer);
                        cardFormContainer.append(cardFormBody);
                        cardForm.append(cardFormContainer);
                        $("#block-info").append(cardForm);
                        
                        cardFormContainer.submit(function (e) {
                            e.preventDefault();
                            var datasetUid = $(this).find("select option:selected").val();
                            var sequence = $.trim($(this).find("textarea").val());
                            var collection = datasetUid;
                            for (var i=0;i<response.datasets.length;i++) {
                                if(response.datasets[i].uid==datasetUid) {
                                    if(response.datasets[i].collection.experiment) {
                                        collection = (response.datasets[i].collection.name + " - " +
                                                      response.datasets[i].collection.experiment);
                                    } else {                                        
                                        collection = response.datasets[i].collection.name;
                                    }
                                }
                            }
                            if(datasetUid && sequence) {
                                var oThis = $(this);
                                oThis.find("button").attr("disabled",true);
                                sequence = sequence.trim();
                                $.ajax({
                                  url: apiLocation+"kmer/"+encodeURIComponent(datasetUid)+"/sequence",
                                  type: "post",
                                  dataType: "json",
                                  contentType: "application/json",  
                                  data: JSON.stringify({"sequence": sequence, "mismatches": 0}),
                                  success: function(subResponse) {
                                      if(sequence.length>0) {
                                          sessionStorage.setItem("apiInterfaceSequence",sequence);
                                      }
                                      var cardResult = $("<div class=\"card mt-3 mb-3\"/>");
                                      var cardResultHeader = $("<div "+
                                           "class=\"card-header font-weight-bold bg-secundary text-dark\"/>");
                                      var cardResultButton = $("<button class=\"btn fa-solid fa-trash\"></button>");
                                      cardResultButton.click(function(event) {
                                          event.preventDefault();
                                          cardResult.remove();
                                          return false;
                                      });
                                      cardResultHeader.append($("<div class=\"float-start\"/>").text(
                                          "Result for sequence of length "+sequence.length));
                                      cardResultHeader.append($("<div class=\"float-end\"></div>").append(
                                          cardResultButton));
                                      cardResult.append(cardResultHeader);                  
                                      var cardResultBody = $("<div class=\"card-body\"/>");
                                      var cardResultVisualization = $("<div/>");
                                      cardResultBody.append(cardResultVisualization);
                                      cardResult.append(cardResultBody); 
                                      $("#block-info").append(cardResult);
                                      visualizeKmerDensity(cardResultVisualization,datasetUid,sequence,
                                                           subResponse,response.name,collection);
                                      oThis.find("button").removeAttr("disabled");
                                      //check ancestors and offspring
                                  },
                                  error: function(jqXHR, textStatus, errorThrown ) {
                                      oThis.find("button").removeAttr("disabled");
                                  }
                                });
                            }
                            return true;
                        });
                    }
                }    
              },
              error: function(xhr) {
                //Do Something to handle error
                $(location).prop("href", "variety/");  
              }
            });    
                
        } else if(searchParams.has("name")) {
            var name = searchParams.get("name");
            //update form
            $("form.variety input.variety").val(name);
            //get values
            $.ajax({
              url: apiLocation+"variety/",
              type: "get",
              data: { 
                name: name
              },
              success: function(response) {
                $("#block-info").removeClass("d-none").html("").show();  
                if(response.total>0) {
                    if((response.total==1) && (response.list.length==1)) {
                        //redirect
                        $(location).prop("href", "variety/"+encodeURIComponent(response.list[0].uid));  
                    } else {    
                        var listContainer = $("<div class=\"list-group\"/>");
                        for (var i = 0; i < response.list.length; i++) {
                          listContainer.append(createVarietyListEntry(response.list[i]));                        
                        }
                        $("#block-info").append(listContainer);
                    }
                } else {
                    $("#block-info").append($("<div class=\"fw-light\"/>").text("No results for '"+name+"'"));
                }    
              },
              error: function(xhr) {
                //Do Something to handle error
              }
            });
        }
    } else if(operation=="collection") {
        
        if(identifier) {   
            //get info
            $.ajax({
              url: apiLocation+"collection/"+encodeURIComponent(identifier),
              type: "get",
              success: function(response) {
                $("#block-info").removeClass("d-none").html("").show();  
                if(!response.uid) {
                    $(location).prop("href", "variety/");
                } else {
                    var cardContainer = $("<div class=\"card mt-3 mb-3\"/>");
                    var cardHeader = $("<div class=\"card-header font-weight-bold bg-primary text-white\"/>");
                    cardHeader.append($("<span class=\"me-1\"/>").text("Collection"));
                    cardHeader.append($("<strong/>").text(response.name));
                    cardContainer.append(cardHeader);                  
                    var cardBody = $("<div class=\"card-body\"/>");
                    var cardTable = $("<table class=\"table table-bordered table-hover\"/>");
                    var cardTableBody = $("<tbody/>");
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Name"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.name)));
                    if(response.experiment) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Experiment"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.experiment)));
                    }
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Type"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.type)));
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Datasets"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.datasets)));
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Varieties"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.varieties)));
                    cardTable.append(cardTableBody);
                    cardBody.append(cardTable);                    
                    cardContainer.append(cardBody); 
                    $("#block-info").append(cardContainer);
                }    
              },
              error: function(xhr) {
                //Do Something to handle error
                $(location).prop("href", "variety/");  
              }
            }); 
            //get list
            var currentPage = 0;
            var number = 10;
            if(window.location.hash) {
                var hashes = window.location.hash.substring(1).split(",");
                for(var i=0;i<hashes.length;i++) {
                    if(hashes[i].startsWith("page")) {
                        currentPage = parseInt(hashes[i].substring(4));
                    }
                }
            }
            $("#block-list").each(function() {getCollectionList($(this), currentPage*number, number);});
            function getCollectionList(container, start, number) {
                var oContainer = container;
                $.ajax({
                    url: apiLocation+"variety/",
                    type: "get",
                    data: {"collection": identifier, "start": start, "number": number},
                    success: function(response) {
                        container.html("");
                        //create navigation
                        var startPage = 0
                        var endPage = Math.floor(response.total/response.number);
                        var currentPage = Math.floor(response.start/response.number);
                        var navContainer = $("<nav class=\"d-flex flex-row\"/>");
                        var posNav = $("<div class=\"d-flex flex-fill justify-content-start\"/>");
                        posNav.append($("<div class=\"ml-1 my-2 text-info\"/>")
                                      .text((response.start+1)+"-"
                                            +(response.start+response.list.length)+" from "+response.total));
                        navContainer.append(posNav);
                        var ulNav = $("<ul class=\"pagination justify-content-end\"/>");
                        navContainer.append(ulNav);
                        var pageLink = $("<a class=\"page-link\" href=\"#\"/>").text("«");
                        pageLink.data("page",0);
                        ulNav.append($("<li class=\"page-item\"/>").append(pageLink));
                        pageLink.click(function(event) {
                            event.preventDefault();
                            getCollectionList(oContainer,$(this).data("page")*number,number);
                            window.location.hash = "page"+$(this).data("page");
                            return false;
                        });
                        var leftSize = (currentPage>=endPage-1) ? (3-(endPage-currentPage)) : 1;
                        var rightSize = (currentPage<=1) ? (3-currentPage) : 1;
                        for(var i = startPage; i<=endPage; i++) {
                            if((i>=currentPage-leftSize)&&(i<=currentPage+rightSize)) {
                                pageLink = $("<a class=\"page-link\" href=\"#\"/>").text(i+1);
                                pageLink.data("page",i);
                                if(i==currentPage) {
                                    pageLink.addClass("active");
                                }
                                pageLink.click(function(event) {
                                    event.preventDefault();
                                    getCollectionList(oContainer,$(this).data("page")*number,number);
                                    window.location.hash = "page"+$(this).data("page");
                                    return false;
                                });
                                ulNav.append($("<li class=\"page-item\"/>").append(pageLink));
                            } else if((i==(currentPage-leftSize-1))||(i==(currentPage+rightSize+1))) {
                                var pageLink = $("<a class=\"page-link\"/>").text("...");
                                ulNav.append($("<li class=\"page-item\"/>").append(pageLink));
                            }
                        }
                        pageLink = $("<a class=\"page-link\" href=\"#\"/>").text("»");
                        pageLink.data("page",endPage);
                        ulNav.append($("<li class=\"page-item\"/>").append(pageLink));
                        pageLink.click(function(event) {
                            event.preventDefault();
                            getCollectionList(oContainer,endPage*number,number);
                            window.location.hash = "page"+endPage;
                            return false;
                        });
                        oContainer.append(navContainer);
                        //create list
                        var listContainer = $("<div class=\"list-group\"/>");
                        for (var i = 0; i < response.list.length; i++) {
                            listContainer.append(createVarietyListEntry(response.list[i]));                         
                        }
                        oContainer.append(listContainer);
                    }
                });
            }
                
        } else {
        }
        
    } else if(operation=="datasets") {
        var selectedDatasets = getSelectedDatasets();            
        var cardContainer = $("<div class=\"card mt-3 mb-3\"/>");
        var cardHeader = $("<div class=\"card-header font-weight-bold bg-primary text-white\"/>");
        cardHeader.append($("<span class=\"me-1\"/>").text("Selected datasets"));
        cardContainer.append(cardHeader);                  
        var cardBody = $("<div class=\"card-body\"/>");
        var cardTable = $("<table class=\"table table-bordered table-hover\"/>");
        var cardTableHead = $("<thead/>");
        cardTableHead.append($("<tr/>").append($("<th scope=\"col\"/>").text("Variety"))
                                       .append($("<th scope=\"col\"/>").text("Year"))
                                       .append($("<th scope=\"col\"/>").text("Origin"))
                                       .append($("<th scope=\"col\"/>").text("Type"))
                                       .append($("<th scope=\"col\"/>").text("Collection"))
                                       .append($("<th scope=\"col\"/>").text("")));
        cardTable.append(cardTableHead);
        var cardTableBody = $("<tbody/>");
        for(entry in selectedDatasets) {
            var dataset = selectedDatasets[entry];
            var datasetRow = $("<tr/>")
            datasetRow.append($("<td scope=\"row\"/>").append(
                $("<a class=\"text-decoration-none\"/>")
                                     .text(dataset.variety.name)
                                     .attr("href", "variety/"+encodeURIComponent(dataset.variety.uid))
                ))
            if(dataset.variety.year) {
                datasetRow.append($("<td/>").text(dataset.variety.year.description));
            } else {
                datasetRow.append($("<td/>"));
            }
            if(dataset.variety.origin) {
                datasetRow.append($("<td/>").text(dataset.variety.origin.country));
            } else {
                datasetRow.append($("<td/>"));
            }
            datasetRow.append($("<td/>").text(dataset.collection.type));
            datasetRow.append($("<td scope=\"row\"/>").append(
                $("<a class=\"text-decoration-none\"/>")
                                     .text(dataset.collection.name)
                                     .attr("href", "collection/"+encodeURIComponent(dataset.collection.uid))
                ))
            
            var datasetDeleteButton = $("<button class=\"btn btn-sm fa-solid fa-trash\"/>");
            datasetDeleteButton.data("dataset",dataset);
            datasetDeleteButton.click(function(event) {
                event.preventDefault();        
                var oThis = $(this);
                var data = oThis.data("dataset");
                deleteSelectedDatasets(data.uid);
                oThis.closest("tr").remove();
                return false;
            });
            datasetRow.append($("<td class=\"col-1 ms-auto\"/>").append(datasetDeleteButton));
            cardTableBody.append(datasetRow);
        }
        cardTable.append(cardTableBody);
        cardBody.append(cardTable);                    
        cardContainer.append(cardBody); 
        $("#block-info").append(cardContainer);
        
        if(selectedDatasets.length>0) {            
            var cardForm = $("<div class=\"card mt-3 mb-3\"/>");
            var cardFormContainer = $("<form/>");
            var cardFormHeader = $("<div class=\"card-header font-weight-bold bg-secundary text-dark\"/>");
            cardFormHeader.append($("<span />").text("Search sequence in datasets"));
            cardFormContainer.append(cardFormHeader);                  
            var cardFormBody = $("<div class=\"card-body\"/>");            
            var formContainer = $("<div class=\"form-floating\"/>");
            var defaultSequence = (("apiInterfaceSequence" in sessionStorage)? 
                                   sessionStorage.getItem("apiInterfaceSequence") : "");
            var formTextarea = $("<textarea class=\"form-control\" placeholder=\"Enter sequence\" "+
                                 "id=\"sequence\" style=\"height: 100px\"/>").text(defaultSequence);
            formContainer.append(formTextarea);
            var formLabel = $("<label for=\"sequence\"/>").text("Sequence");
            formContainer.append(formLabel);
            var formButtons = $("<div class=\"d-grid gap-2 d-md-flex justify-content-md-end\"/>");
            var formSubmitButton = $("<button class=\"btn btn-primary mt-2 pull-right\"/>")
                    .attr("type","submit").text("Search");
            if(!(defaultSequence=="")) {
                var cardResetButton = $("<button class=\"btn fa-solid fa-rotate-left\"></button>");
                cardFormHeader.append($("<div class=\"float-end\"></div>").append(cardResetButton));
                cardResetButton.click(function(event) {
                  event.preventDefault();
                  formTextarea.text("");
                  sessionStorage.setItem("apiInterfaceSequence","");
                  cardResetButton.remove();
                  return false;
                });
            }
            formButtons.append(formSubmitButton);
            formContainer.append(formButtons);
            cardFormBody.append(formContainer);
            cardFormContainer.append(cardFormBody);
            cardForm.append(cardFormContainer);
            $("#block-info").append(cardForm);

            cardFormContainer.submit(async function (e) {
                e.preventDefault();
                var oThis = $(this);
                oThis.find("button").attr("disabled",true);
                var selectedDatasets = getSelectedDatasets();   
                var sequence = $.trim($(this).find("textarea").val());
                //output
                var cardResult = $("<div class=\"card mt-3 mb-3\"/>");
                var cardResultHeader = $("<div "+
                   "class=\"card-header font-weight-bold bg-secundary text-dark\"/>");
                var cardResultButton = $("<button class=\"btn fa-solid fa-trash\"></button>");
                cardResultButton.click(function(event) {
                  event.preventDefault();
                  cardResult.remove();
                  return false;
                });
                cardResultHeader.append($("<div class=\"float-start\"/>").text(
                  "Result for sequence of length "+sequence.length+" and "+selectedDatasets.length+" datasets"));
                cardResultHeader.append($("<div class=\"float-end\"></div>").append(
                  cardResultButton));
                cardResult.append(cardResultHeader);                  
                var cardResultBody = $("<div class=\"card-body overflow-scroll\"/>");
                var cardResultTable = $("<table class=\"table table-sm table-bordered table-hover\"/>");
                var cardResultTableHead = $("<thead/>");
                cardResultTableHeadRow = $("<tr/>")
                    .append($("<th scope=\"col\" />").text("k-mer"));
                cardResultTableBodyRowYear = $("<tr/>")
                    .append($("<th scope=\"col\" />").text("Year")).hide();
                cardResultTableBodyRowOrigin = $("<tr/>")
                    .append($("<th scope=\"col\" />").text("Origin")).hide();
                cardResultTableBodyRowType = $("<tr/>")
                    .append($("<th scope=\"col\" />").text("Type")).hide();
                cardResultTableBodyRowCollection = $("<tr/>")
                    .append($("<th scope=\"col\" />").text("Collection")).hide();
                for (var j=0; j<selectedDatasets.length; j++) {
                    cardResultTableHeadRow.append($("<th scope=\"col\"/>")
                                  .text(selectedDatasets[j].variety.name)
                                  .css("text-orientation","mixed").css("writing-mode","vertical-rl"));
                    if(selectedDatasets[j].variety.year) {
                        cardResultTableBodyRowYear.append($("<th scope=\"col\"/>")
                                  .text(selectedDatasets[j].variety.year.description));
                    } else {
                        cardResultTableBodyRowYear.append($("<th scope=\"col\"/>"));
                    }
                    if(selectedDatasets[j].variety.origin) {
                        cardResultTableBodyRowOrigin.append($("<th scope=\"col\"/>")
                                  .text(selectedDatasets[j].variety.origin.country));
                    } else {
                        cardResultTableBodyRowOrigin.append($("<th scope=\"col\"/>"));
                    }
                    cardResultTableBodyRowType.append($("<th scope=\"col\"/>")
                                  .text(selectedDatasets[j].collection.type));
                    cardResultTableBodyRowCollection.append($("<th scope=\"col\"/>")
                                  .text(selectedDatasets[j].collection.name));
                }
                cardResultTableHead.append(cardResultTableHeadRow)
                cardResultTable.append(cardResultTableHead);
                var cardResultTableBody = $("<tbody/>");
                cardResultTableBody.append(cardResultTableBodyRowYear)
                cardResultTableBody.append(cardResultTableBodyRowOrigin)
                cardResultTableBody.append(cardResultTableBodyRowType)
                cardResultTableBody.append(cardResultTableBodyRowCollection)
                cardResultTable.append(cardResultTableBody); 
                cardResultWarning = $("<div class=\"alert alert-warning\" role=\"alert\"/>").text("Loading k-mer data...");
                cardResultBody.append(cardResultWarning);
                cardResultBody.append($("<div/>").append(cardResultTable));
                cardResult.append(cardResultBody); 
                $("#block-info").append(cardResult);                
                //process data
                var datasetCounter;                
                for(datasetCounter=0;datasetCounter<selectedDatasets.length;datasetCounter++) {
                    var datasetUid = selectedDatasets[datasetCounter].uid;
                    if(datasetUid && sequence) {
                        sequence = sequence.trim();
                        await $.ajax({
                          url: apiLocation+"kmer/"+encodeURIComponent(datasetUid)+"/sequence",
                          type: "post",
                          dataType: "json",
                          contentType: "application/json",  
                          data: JSON.stringify({"sequence": sequence, "mismatches": 0}),
                          success: function(subResponse) {
                              if(sequence.length>0) {
                                  sessionStorage.setItem("apiInterfaceSequence",sequence);
                              }    
                              //create table
                              if(datasetCounter==0) {
                                  var k = subResponse.info.kmer_length;
                                  var n = sequence.length - k + 1;
                                  for (var i = 0; i < n; i++) {
                                      var skmer = sequence.substring(i,i+k);
                                      cardResultTableRow = $("<tr/>").attr("data-kmer",skmer);
                                      cardResultTableRow.append($("<th class=\"col-3\"/>").attr("scope","row").text(skmer));
                                      for (var j=0; j<selectedDatasets.length; j++) {
                                          cardResultTableRow.append($("<td class=\"col-1 ms-auto\"/>"));
                                      }
                                      cardResultTableBody.append(cardResultTableRow);
                                  }
                              }
                              //fill correct column 
                              if(Object.keys(subResponse.kmers).length>0) {
                                  var subsetValues = []
                                  var allSubsetValues = Object.values(subResponse.kmers);
                                  for(var i in allSubsetValues) {
                                      if(allSubsetValues[i]>0) {
                                          subsetValues.push(allSubsetValues[i]);
                                      }    
                                  }
                                  subsetValues.sort(function(a, b) {
                                      return a - b;
                                  });
                                  var maxValue = 3*subsetValues[Math.floor(subsetValues.length/2)];
                                  var minValue = 1;
                                  for(var rkmer in subResponse.kmers) {
                                      var frequency = subResponse.kmers[rkmer];
                                      var rgb = 255 - Math.max(0,Math.min(255,Math.ceil(255*(frequency-minValue)/maxValue)));
                                      if(frequency==0) {
                                          cardResultTableBody.find("tr[data-kmer=\""+rkmer+"\"] td:eq("+datasetCounter+")")
                                              .text(frequency).addClass("bg-danger text-white text-center");
                                      } else {
                                          cardResultTableBody.find("tr[data-kmer=\""+rkmer+"\"] td:eq("+datasetCounter+")")
                                              .text(frequency+datasetCounter).addClass("text-white text-center")
                                              .css("background-color","rgb("+rgb+",0,"+rgb+")");
                                      }
                                  }
                              }    
                              if(datasetCounter==selectedDatasets.length-1) {
                                 cardResultWarning.remove();
                                 cardResultTable.DataTable( {
                                    colReorder: {
                                        fixedColumnsLeft: 1
                                    },
                                    paging: false,
                                    searching: false,
                                    ordering: false,
                                    info: false,
                                    dom: "B<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
                                         "<'row'<'col-sm-12'tr>>" +
                                         "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
                                    buttons: [
                                        {
                                            extend: "csv",
                                            text: "CSV",
                                            filename: "kmer_frequencies_"+new Date().toISOString().split(".")[0]
                                        },
                                        {
                                            extend: "excel",
                                            text: "EXCEL",
                                            messageTop: false,
                                            messageBottom: false,
                                            title: null,
                                            sheetName: "frequencies",
                                            filename: "kmer_frequencies_"+new Date().toISOString().split(".")[0]
                                        }
                                    ]
                                } );                                
                              }
                              oThis.find("button").removeAttr("disabled");
                          },
                          error: function(jqXHR, textStatus, errorThrown ) {
                              oThis.find("button").removeAttr("disabled");
                          }
                        });
                    }                
                }
                return true;
            });
        }

    } 
    
});