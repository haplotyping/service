$( function() {
    
    //define variables
    var apiLocation = $("body").data("api");
    var rootLocation = $("body").data("root");
    var operation = $("body").data("operation");    
    var identifier = $("body").data("identifier");    
    var searchParams = new URLSearchParams(window.location.search)
    
    function visualizeKmerDensity(container,sequence,response,title,collection) {
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
            bins = []
            for (var i = 0; i < n; i++) {
                var kmer = sequence.substring(i,i+k);
                if(kmer in response.kmers) {
                    bins.push({"kmer": kmer, "position": i, "frequency": response.kmers[kmer]});
                } else {
                    bins.push({"kmer": kmer, "position": i, "frequency": 0});
                }
            }
            var containerWidth = container.width(),
                containerHeight = 250,
                marginBottom = 50,
                marginLeft = 40,
                marginTop = 20,
                marginRight = 20;
            var svg = d3.select(container.get(0)).append("svg")
                .attr("width", containerWidth)
                .attr("height", containerHeight)
                .append("g")
                .attr("transform", "translate(0,0)");

            var x = d3.scaleLinear()
                  .domain([0,sequence.length-k+1])     
                  .range([0, containerWidth-marginLeft-marginRight]);
            svg.append("g")
                  .attr("transform", "translate(" + (marginLeft+(x(1)/2))+ "," + (containerHeight-marginBottom) + ")")
                  .call(d3.axisBottom(x).ticks(Math.min((sequence.length - k + 1),10)).tickFormat(d3.format("d")));

            var histogram = d3.histogram()
                  .domain(x.domain())
                  .thresholds(x.ticks(sequence.length));

            var y = d3.scaleLinear()
                  .range([containerHeight-marginBottom,marginTop]);
                  y.domain([0, response.stats.maximum]);

            svg.append("g")
                  .attr("transform", "translate(" + marginLeft + ",0)")
                  .call(d3.axisLeft(y).tickFormat(d3.format("d")));

            svg.selectAll(".rect1")
                  .data(bins)
                  .enter()
                  .append("rect")
                    .attr("x", marginLeft)
                    .attr("transform", function(d) { return "translate(" + x(d.position) + ", "+y(d.frequency)+" )"; })
                    .attr("width", function(d) { return x(1); })
                    .attr("height", function(d) { return y(0)-y(d.frequency); });

            svg.selectAll(".rect2")
                  .data(bins)
                  .enter()
                  .append("rect")
                    .attr("x", marginLeft)
                    .attr("transform", function(d) { return "translate(" + x(d.position) + ", "+
                                (containerHeight-(marginBottom/2))+" )"; })
                    .attr("width", function(d) { return x(1); })
                    .attr("height", function(d) { if(d.frequency==0) {return 10;} else {return 0;} })
                    .attr("fill", "red");
        }
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
            },
        }).autocomplete( "instance" )._renderItem = function( ul, item ) {
            var content = $("<div/>");
            var contentMain = $("<div/>");
            contentMain.append($("<span class=\"fw-bold\"/>").text(item.name));
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
                    cardHeader.append($("<span class=\"me-1\"/>").text("Variety information"));
                    cardHeader.append($("<strong/>").text(response.name));
                    cardContainer.append(cardHeader);                  
                    var cardBody = $("<div class=\"card-body\"/>");
                    var cardTable = $("<table class=\"table table-bordered table-hover\"/>");
                    var cardTableBody = $("<tbody/>");
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Name"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.name)));
                    if(response.synonyms) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Synonym"))
                                                       .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                         .text(response.synonyms
                                                                                               .replace(/,/g,", "))));
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
                    if(response.parents && (response.parents.length>0)) {
                        cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Parents"))
                                                       .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                       .append(createParents(response.parents, true, false))));
                    }
                    if(response.offspring && (response.offspring.length>0)) {
                        var offspringRow = $("<td class=\"col-3\"/>").attr("scope","row");
                        for (var i=0;i<response.offspring.length;i++) {
                            offspringRow.append($("<div/>").append($("<a class=\"text-decoration-none\"/>").attr("href",
                                   "variety/"+encodeURIComponent(response.offspring[i].uid))
                                                           .text(response.offspring[i].name)));
                        }
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
                            }
                            datasetsTbody.append($("<tr/>").append($("<td/>").text(response.datasets[i].type))
                                                 .append($("<td/>").append(
                                                    $("<a class=\"text-decoration-none\"/>")
                                                        .text(response.datasets[i].collection.name)
                                                        .attr("href",
                                                              "collection/" + 
                                                              encodeURIComponent(response.datasets[i].collection.uid))))
                                                 .append($("<td/>").text(response.datasets[i].collection.type)));
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
                        var cardFormHeader = $("<div class=\"card-header font-weight-bold bg-secundary text-dark\"/>")
                                                    .text("Search sequence "+response.name);
                        cardFormContainer.append(cardFormHeader);                  
                        var cardFormBody = $("<div class=\"card-body\"/>");
                        var formSelect = $("<select class=\"form-select mb-2\"/>");
                        if(kmerDatasets.length==1) {
                            formSelect.attr("disabled",1);
                        }
                        for (var i=0;i<kmerDatasets.length;i++) {
                            var formOption = $("<option/>").attr("value",kmerDatasets[i].uid)
                                                      .text(kmerDatasets[i].collection.name+" - "+kmerDatasets[i].uid);
                            if(i==0) {
                                formOption.attr("selected","1");
                            }
                            formSelect.append(formOption);
                        }
                        cardFormBody.append(formSelect);
                        var formContainer = $("<div class=\"form-floating\"/>");
                        var formTextarea = $("<textarea class=\"form-control\" placeholder=\"Enter sequence\" "+
                                             "id=\"sequence\" style=\"height: 100px\"/>");
                        formContainer.append(formTextarea);
                        var formLabel = $("<label for=\"sequence\"/>").text("Sequence");
                        formContainer.append(formLabel);
                        var formButtons = $("<div class=\"d-grid gap-2 d-md-flex justify-content-md-end\"/>");
                        var formSubmitButton = $("<button class=\"btn btn-primary mt-2 pull-right\"/>")
                                .attr("type","submit").text("Search");
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
                                    collection = response.datasets[i].collection.name;
                                }
                            }
                            if(datasetUid && sequence) {
                                var oThis = $(this);
                                oThis.find("button").attr("disabled",true);
                                $.ajax({
                                  url: apiLocation+"kmer/"+encodeURIComponent(datasetUid)+"/sequence",
                                  type: "post",
                                  dataType: "json",
                                  contentType: "application/json",  
                                  data: JSON.stringify({"sequence": sequence, "mismatches": 0}),
                                  success: function(subResponse) {
                                      var cardResult = $("<div class=\"card mt-3 mb-3\"/>");
                                      var cardResultHeader = $("<div "+
                                           "class=\"card-header font-weight-bold bg-secundary text-dark\"/>")
                                          .text("Result for sequence of length "+sequence.length);
                                      cardResult.append(cardResultHeader);                  
                                      var cardResultBody = $("<div class=\"card-body\"/>");
                                      var cardResultVisualization = $("<div/>");
                                      cardResultBody.append(cardResultVisualization);
                                      cardResult.append(cardResultBody); 
                                      $("#block-info").append(cardResult);
                                      visualizeKmerDensity(cardResultVisualization,sequence,
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
                    cardTableBody.append($("<tr/>").append($("<th class=\"col-3\"/>").text("Experiment"))
                                                   .append($("<td class=\"col-3\"/>").attr("scope","row")
                                                                                     .text(response.experiment)));
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
        
    }
    

    
});