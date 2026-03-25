package com.hirepath.recruitment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hirepath.recruitment.domain.Offer;

public interface OfferRepository extends JpaRepository<Offer, UUID> {
    @EntityGraph(attributePaths = "approvals")
    List<Offer> findAll(Sort sort);

    @EntityGraph(attributePaths = "approvals")
    Optional<Offer> findById(UUID id);
}
